import { NextRequest } from "next/server";
import { planStory, DEFAULT_CHAT_MODEL } from "@/lib/groq";
import { generateImage, DEFAULT_IMAGE_MODEL } from "@/lib/cf-image";
import { store } from "@/lib/store";
import { saveGeneration, updateGenerationAssets } from "@/lib/history";
import { errMessage, sse } from "@/lib/sse";
import type { AssetsMap, BookSpec, StreamEvent } from "@/lib/types";

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
      let currentStage = "A.plan";

      try {
        send({ kind: "stage.start", stage: currentStage });

        const spec = specProvided ?? (await planStory(prompt));
        send({ kind: "story.plan", spec });

        const planKey = `generations/${genId}/book.json`;
        await store.put(planKey, Buffer.from(JSON.stringify(spec, null, 2)));
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

        // ── B0: cover ──────────────────────────────────────────────────────
        currentStage = "B0.cover";
        send({ kind: "stage.start", stage: currentStage });
        send({
          kind: "step.started",
          stage: currentStage,
          step_index: 0,
          total_steps: 1,
          provider: "cf",
          model: DEFAULT_IMAGE_MODEL,
        });
        const coverStart = Date.now();
        try {
          const img = await generateImage(
            spec.style_prompt
              ? `${spec.style_prompt}, ${spec.cover_prompt}`
              : spec.cover_prompt,
          );
          const key = `generations/${genId}/cover.png`;
          await store.put(key, img.data);
          const asset = {
            url: store.url(key),
            media_type: img.mediaType,
            width: img.width,
            height: img.height,
            size_bytes: img.data.length,
          };
          assets.cover = asset;
          send({
            kind: "step.completed",
            stage: currentStage,
            step_index: 0,
            elapsed_sec: (Date.now() - coverStart) / 1000,
            assets: [asset],
          });
        } catch (err) {
          send({
            kind: "step.failed",
            stage: currentStage,
            step_index: 0,
            error: errMessage(err),
          });
          send({
            kind: "notice",
            stage: currentStage,
            message: "Cover image generation failed — continuing with page illustrations.",
          });
        }

        // ── B1: illustrations ──────────────────────────────────────────────
        currentStage = "B1.illustrations";
        send({ kind: "stage.start", stage: currentStage });
        const total = spec.pages.length;
        let failures = 0;
        for (let i = 0; i < total; i++) {
          send({
            kind: "step.started",
            stage: currentStage,
            step_index: i,
            total_steps: total,
            provider: "cf",
            model: DEFAULT_IMAGE_MODEL,
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
            await store.put(key, img.data);
            const asset = {
              url: store.url(key),
              media_type: img.mediaType,
              width: img.width,
              height: img.height,
              size_bytes: img.data.length,
            };
            assets[`page_${i}`] = asset;
            send({
              kind: "step.completed",
              stage: currentStage,
              step_index: i,
              elapsed_sec: (Date.now() - stepStart) / 1000,
              assets: [asset],
            });
          } catch (err) {
            failures += 1;
            send({
              kind: "step.failed",
              stage: currentStage,
              step_index: i,
              error: errMessage(err),
            });
          }
        }
        if (failures > 0) {
          send({
            kind: "notice",
            stage: currentStage,
            message: "Illustration pipeline completed with warnings.",
          });
        }

        // ── B2: narration (live in the reader) ─────────────────────────────
        currentStage = "B2.narration";
        send({
          kind: "notice",
          stage: currentStage,
          message:
            "Narration is generated live in the reader — the book will not include per-page audio.",
        });

        // ── C: compose ─────────────────────────────────────────────────────
        currentStage = "C.compose";
        send({ kind: "stage.start", stage: currentStage });
        if (Object.keys(assets).length === 0) {
          send({
            kind: "notice",
            stage: currentStage,
            message: "No assets were produced — check provider configuration.",
          });
        } else {
          send({
            kind: "notice",
            stage: currentStage,
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
      } catch (err) {
        send({
          kind: "error",
          stage: currentStage,
          code: "generation_failed",
          retryable: true,
          message: errMessage(err),
          hint: "Check provider API keys and try again.",
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
