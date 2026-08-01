export interface GeneratedImage {
  data: Buffer;
  mediaType: string;
  width: number;
  height: number;
}

const MODEL = "@cf/black-forest-labs/flux-1-schnell";

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
  const clean = prompt.replace(/\s+/g, " ").trim().slice(0, 500);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

  // cf returns the png base64-encoded inside result.image
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt: clean }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Image provider error (${res.status})`);
  }

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
