import { NextRequest } from "next/server";
import { readFile } from "@/lib/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  json: "application/json",
  mp3: "audio/mpeg",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string[] }> },
) {
  const { key } = await ctx.params;
  const joined = key.join("/");
  const buf = await readFile(joined);
  if (!buf) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }
  const ext = joined.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
