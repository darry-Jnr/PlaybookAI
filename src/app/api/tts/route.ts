import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { errMessage, errorResponse } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";

  if (!process.env.ELEVENLABS_API_KEY) {
    return errorResponse(502, "ElevenLabs API key not configured.");
  }
  if (!text.trim()) {
    return errorResponse(422, "Text is required.");
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
    return errorResponse(502, errMessage(err));
  }
}
