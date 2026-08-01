import { NextRequest } from "next/server";
import { collectImages, loadSpec } from "@/lib/history";
import { buildEpub } from "@/lib/ebook/epub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9 _-]/g, "_").slice(0, 60);
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const spec = await loadSpec(id);
  if (!spec) {
    return Response.json({ detail: "Generation not found" }, { status: 404 });
  }
  const images = await collectImages(id);
  if (Object.keys(images).length === 0) {
    return Response.json(
      { detail: "No assets found — generate images first" },
      { status: 404 },
    );
  }
  const epub = await buildEpub(spec, images);
  return new Response(new Uint8Array(epub), {
    headers: {
      "Content-Type": "application/epub+zip",
      "Content-Disposition": `attachment; filename="${safeFilename(spec.title)}.epub"`,
    },
  });
}
