import { NextRequest } from "next/server";
import { Render } from "@renderinc/sdk";
import { planStory } from "@/lib/groq";
import { generateImage } from "@/lib/cf-image";
import { assetUrl, saveFile } from "@/lib/files";
import { saveGeneration, updateGenerationAssets } from "@/lib/history";
import { errMessage, sse } from "@/lib/sse";
import type { AssetsMap, BookSpec, StreamEvent } from "@/lib/types";

const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  const specProvided = (body?.spec as BookSpec | undefined) ?? null;
  const generationId =
    typeof body?.generation_id === "string" ? body.generation_id : null;
  const genId = generationId ?? crypto.randomUUID();
  const sessionId = req.headers.get("x-session-id") ?? "anon";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(sse(ev)));
      };
      const state = { stage: "A.plan" };

      try {
        const useWorkflows =
          process.env.RENDER_API_KEY && process.env.PLAYBOOK_WORKFLOW_SLUG;
        if (useWorkflows && specProvided) {
          await runWorkflowPipeline(send, state, genId, specProvided);
        } else {
          await runInlinePipeline(send, state, genId, prompt, specProvided, sessionId);
        }
      } catch (err) {
        send({
          kind: "error",
          stage: state.stage,
          message: errMessage(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const maxDuration = 300;

type Send = (ev: StreamEvent) => void;
type State = { stage: string };

async function runInlinePipeline(
  send: Send,
  state: State,
  genId: string,
  prompt: string,
  specProvided: BookSpec | null,
  sessionId: string,
): Promise<void> {
  state.stage = "A.plan";
  send({ kind: "stage.start", stage: state.stage });

  const spec = specProvided ?? (await planStory(prompt));
  send({ kind: "story.plan", spec });

  const planKey = `generations/${genId}/book.json`;
  await saveFile(planKey, Buffer.from(JSON.stringify(spec, null, 2)));
  if (!specProvided) {
    await saveGeneration(sessionId, {
      id: genId,
      prompt,
      title: spec.title,
      summary: prompt,
      plan_key: planKey,
      created_at: new Date().toISOString(),
      spec,
      assets: {},
    });
  }

  const assets: AssetsMap = {};

  state.stage = "B0.cover";
  send({ kind: "stage.start", stage: state.stage });
  send({
    kind: "step.started",
    stage: state.stage,
    step_index: 0,
    total_steps: 1,
    provider: "cf",
    model: IMAGE_MODEL,
  });
  const coverStart = Date.now();
  try {
    const img = await generateImage(
      spec.style_prompt
        ? `${spec.style_prompt}, ${spec.cover_prompt}`
        : spec.cover_prompt,
    );
    const key = `generations/${genId}/cover.png`;
    await saveFile(key, img.data);
    const asset = {
      url: assetUrl(key),
      media_type: img.mediaType,
      width: img.width,
      height: img.height,
      size_bytes: img.data.length,
    };
    assets.cover = asset;
    send({
      kind: "step.completed",
      stage: state.stage,
      step_index: 0,
      elapsed_sec: (Date.now() - coverStart) / 1000,
      assets: [asset],
    });
  } catch (err) {
    send({
      kind: "step.failed",
      stage: state.stage,
      step_index: 0,
      error: errMessage(err),
    });
    send({
      kind: "notice",
      stage: state.stage,
      message: "Cover image generation failed — continuing with page illustrations.",
    });
  }

  // generate one illustration per page, best effort — a failed page
  // just gets skipped so the rest of the book still comes out
  state.stage = "B1.illustrations";
  send({ kind: "stage.start", stage: state.stage });
  const total = spec.pages.length;
  let failures = 0;
  for (let i = 0; i < total; i++) {
    send({
      kind: "step.started",
      stage: state.stage,
      step_index: i,
      total_steps: total,
      provider: "cf",
      model: IMAGE_MODEL,
    });
    const stepStart = Date.now();
    try {
      const page = spec.pages[i];
      const img = await generateImage(
        spec.style_prompt
          ? `${spec.style_prompt}, ${page.illustration_prompt}`
          : page.illustration_prompt,
      );
      const key = `generations/${genId}/page_${i}.png`;
      await saveFile(key, img.data);
      const asset = {
        url: assetUrl(key),
        media_type: img.mediaType,
        width: img.width,
        height: img.height,
        size_bytes: img.data.length,
      };
      assets[`page_${i}`] = asset;
      send({
        kind: "step.completed",
        stage: state.stage,
        step_index: i,
        elapsed_sec: (Date.now() - stepStart) / 1000,
        assets: [asset],
      });
    } catch (err) {
      failures += 1;
      send({
        kind: "step.failed",
        stage: state.stage,
        step_index: i,
        error: errMessage(err),
      });
    }
  }
  if (failures > 0) {
    send({
      kind: "notice",
      stage: state.stage,
      message: "Illustration pipeline completed with warnings.",
    });
  }

  // B2 narration is generated live in the reader, so nothing to do here
  state.stage = "B2.narration";
  send({
    kind: "notice",
    stage: state.stage,
    message:
      "Narration is generated live in the reader — the book will not include per-page audio.",
  });

  state.stage = "C.compose";
  send({ kind: "stage.start", stage: state.stage });
  if (Object.keys(assets).length === 0) {
    send({
      kind: "notice",
      stage: state.stage,
      message: "No assets were produced — check provider configuration.",
    });
  } else {
    send({
      kind: "notice",
      stage: state.stage,
      message: `Generated ${Object.keys(assets).length} asset(s).`,
    });
  }

  await updateGenerationAssets(genId, assets);
  send({
    kind: "compose.complete",
    assets,
    spec,
    run_id: genId,
    title: spec.title,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isDone = (status?: string) =>
  status === "completed" || status === "succeeded";

async function runWorkflowPipeline(
  send: Send,
  state: State,
  genId: string,
  spec: BookSpec,
): Promise<void> {
  const render = new Render();
  const slug = `${process.env.PLAYBOOK_WORKFLOW_SLUG}/generateBook`;
  const total = spec.pages.length;
  const assets: AssetsMap = {};

  state.stage = "A.plan";
  send({ kind: "stage.start", stage: state.stage });

  const started = await render.workflows.startTask(slug, [genId, spec]);

  state.stage = "B0.cover";
  send({ kind: "stage.start", stage: state.stage });

  type RunInfo = {
    kind: "cover" | "page";
    index: number;
    started: boolean;
    done: boolean;
    startedAt?: string;
  };
  const known = new Map<string, RunInfo>();
  let rootDone = false;

  while (!rootDone) {
    await sleep(2000);
    let runs;
    try {
      runs = await render.workflows.listTaskRuns({
        rootTaskRunId: [started.taskRunId],
      });
    } catch {
      continue;
    }

    for (const item of runs) {
      const run = item.taskRun;
      if (run.id === started.taskRunId) {
        if (isDone(run.status)) {
          rootDone = true;
        } else if (run.status === "failed" || run.status === "canceled") {
          throw new Error("Story generation failed on Render.");
        }
        continue;
      }

      let info = known.get(run.id);
      if (!info) {
        const details = await render.workflows
          .getTaskRun(run.id)
          .catch(() => null);
        const input = details?.input;
        if (!Array.isArray(input) || input.length < 2) continue;
        const isPage = input.length >= 3;
        info = {
          kind: isPage ? "page" : "cover",
          index: isPage ? Number(input[2]) : 0,
          started: false,
          done: false,
          startedAt: details?.startedAt,
        };
        known.set(run.id, info);
      }

      if (!info.started) {
        send({
          kind: "step.started",
          stage: info.kind === "cover" ? "B0.cover" : "B1.illustrations",
          step_index: info.index,
          total_steps: info.kind === "cover" ? 1 : total,
          provider: "cf",
          model: IMAGE_MODEL,
        });
        info.started = true;
      }

      if (info.done) continue;
      if (isDone(run.status)) {
        const name = info.kind === "cover" ? "cover" : `page_${info.index}`;
        const asset = { url: assetUrl(`generations/${genId}/${name}.png`) };
        assets[name] = asset;
        const elapsed =
          info.startedAt && run.completedAt
            ? (new Date(run.completedAt).getTime() -
                new Date(info.startedAt).getTime()) /
              1000
            : 0;
        send({
          kind: "step.completed",
          stage: info.kind === "cover" ? "B0.cover" : "B1.illustrations",
          step_index: info.index,
          elapsed_sec: elapsed,
          assets: [asset],
        });
        info.done = true;
      } else if (run.status === "failed" || run.status === "canceled") {
        send({
          kind: "step.failed",
          stage: info.kind === "cover" ? "B0.cover" : "B1.illustrations",
          step_index: info.index,
          error: "Image generation failed after retries.",
        });
        info.done = true;
      }
    }
  }

  state.stage = "B2.narration";
  send({
    kind: "notice",
    stage: state.stage,
    message:
      "Narration is generated live in the reader — the book will not include per-page audio.",
  });

  state.stage = "C.compose";
  send({ kind: "stage.start", stage: state.stage });
  send({
    kind: "notice",
    stage: state.stage,
    message: `Generated ${Object.keys(assets).length} asset(s).`,
  });

  await updateGenerationAssets(genId, assets);
  send({
    kind: "compose.complete",
    assets,
    spec,
    run_id: genId,
    title: spec.title,
  });
}
