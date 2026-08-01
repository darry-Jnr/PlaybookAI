export const DEFAULT_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

export interface GeneratedImage {
  data: Buffer;
  mediaType: string;
  width: number;
  height: number;
}

export function pngSize(data: Buffer): { width: number; height: number } {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50) {
    return {
      width: data.readUInt32BE(16),
      height: data.readUInt32BE(20),
    };
  }
  return { width: 0, height: 0 };
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CF_ACCOUNT_ID / CF_API_TOKEN are not set.");
  }
  const model = process.env.IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 500);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: clean }),
      signal: AbortSignal.timeout(120_000),
    });

    if (res.ok) {
      const body = await res.json();
      if (!body?.success) {
        const msg = body?.errors?.[0]?.message ?? "unknown error";
        throw new Error(`Cloudflare AI error: ${msg}`);
      }
      const b64 = body?.result?.image;
      if (typeof b64 !== "string") {
        throw new Error("Cloudflare AI returned no image.");
      }
      const data = Buffer.from(b64, "base64");
      const { width, height } = pngSize(data);
      return { data, mediaType: "image/png", width, height };
    }

    lastErr = new Error(`Image provider error (${res.status})`);
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("Image generation failed.");
}
