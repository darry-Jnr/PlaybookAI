import { task } from "@renderinc/sdk/workflows";
import { generateImage } from "../src/lib/cf-image";
import type { BookSpec } from "../src/lib/types";

const WEB_SERVICE_URL = process.env.WEB_SERVICE_URL ?? "http://localhost:3000";

async function upload(
  genId: string,
  name: string,
  data: Buffer,
  mediaType: string,
): Promise<void> {
  const res = await fetch(`${WEB_SERVICE_URL}/api/internal/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-secret": process.env.INGEST_SECRET ?? "",
    },
    body: JSON.stringify({
      genId,
      name,
      mediaType,
      data: data.toString("base64"),
    }),
  });
  if (!res.ok) {
    throw new Error(`ingest ${name} failed (${res.status})`);
  }
}

export const generateCover = task(
  {
    name: "generateCover",
    retry: { maxRetries: 3, waitDurationMs: 2000, backoffScaling: 2 },
    timeoutSeconds: 600,
    plan: "standard",
  },
  async function generateCover(genId: string, spec: BookSpec): Promise<string> {
    const prompt = spec.style_prompt
      ? `${spec.style_prompt}, ${spec.cover_prompt}`
      : spec.cover_prompt;
    const img = await generateImage(prompt);
    await upload(genId, "cover", img.data, img.mediaType);
    return "cover";
  },
);

export const generatePage = task(
  {
    name: "generatePage",
    retry: { maxRetries: 3, waitDurationMs: 2000, backoffScaling: 2 },
    timeoutSeconds: 600,
    plan: "standard",
  },
  async function generatePage(
    genId: string,
    spec: BookSpec,
    index: number,
  ): Promise<string> {
    const page = spec.pages[index];
    const prompt = spec.style_prompt
      ? `${spec.style_prompt}, ${page.illustration_prompt}`
      : page.illustration_prompt;
    const img = await generateImage(prompt);
    await upload(genId, `page_${index}`, img.data, img.mediaType);
    return `page_${index}`;
  },
);

export const generateBook = task(
  {
    name: "generateBook",
    retry: { maxRetries: 1, waitDurationMs: 3000, backoffScaling: 2 },
    timeoutSeconds: 3600,
    plan: "starter",
  },
  async function generateBook(genId: string, spec: BookSpec): Promise<string[]> {
    return Promise.all([
      generateCover(genId, spec),
      ...spec.pages.map((_, index) => generatePage(genId, spec, index)),
    ]);
  },
);
