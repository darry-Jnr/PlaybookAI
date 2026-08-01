import { NextRequest } from "next/server";
import { planStory } from "@/lib/groq";
import { saveFile } from "@/lib/files";
import { saveGeneration } from "@/lib/history";
import { errMessage, errorResponse } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 4) {
    return errorResponse(422, "Prompt must be at least 4 characters.");
  }

  try {
    const spec = await planStory(prompt);
    const genId = crypto.randomUUID();
    const sessionId = req.headers.get("x-session-id") ?? "anon";
    const planKey = `generations/${genId}/book.json`;

    await saveFile(planKey, Buffer.from(JSON.stringify(spec, null, 2)));
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

    return Response.json({ spec, plan_key: planKey, generation_id: genId });
  } catch (err) {
    return errorResponse(502, errMessage(err));
  }
}
