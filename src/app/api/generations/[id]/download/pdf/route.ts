import { NextRequest } from "next/server";
import { collectImages, loadSpec } from "@/lib/history";
import { buildPdf } from "@/lib/ebook/pdf";

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
  const pdf = await buildPdf(spec, images);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(spec.title)}.pdf"`,
    },
  });
}
