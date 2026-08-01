import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { apiError, errMessage } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  if (!process.env.ELEVENLABS_API_KEY) {
    return apiError(
      502,
      "tts_not_configured",
      "ElevenLabs API key not configured.",
      "Set ELEVENLABS_API_KEY in .env.local and restart.",
    );
  }
  if (!text.trim()) {
    return apiError(422, "bad_text", "Text is required.");
  }

  try {
    const { data, contentType } = await synthesizeSpeech(text);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return apiError(502, "tts_upstream_error", errMessage(err), undefined, true);
  }
}
