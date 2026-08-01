export const DEFAULT_VOICE_ID = "ErXwobaYiN019PkySvjV";

export interface SpeechResult {
  data: Buffer;
  contentType: string;
}

export async function synthesizeSpeech(text: string): Promise<SpeechResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not set.");
  }
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.35, similarity_boost: 0.85 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`TTS provider error (${res.status})`);
  }

  const data = Buffer.from(await res.arrayBuffer());
  return { data, contentType: res.headers.get("content-type") ?? "audio/mpeg" };
}
