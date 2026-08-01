import { NextRequest } from "next/server";
import { deleteGeneration, getGeneration } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const gen = await getGeneration(id);
  if (!gen) {
    return Response.json({ detail: "Generation not found" }, { status: 404 });
  }
  return Response.json({
    id: gen.id,
    prompt: gen.prompt,
    title: gen.title,
    summary: gen.summary ?? gen.prompt,
    spec: gen.spec,
    assets: gen.assets ?? {},
    plan_key: gen.plan_key,
    created_at: gen.created_at,
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = await deleteGeneration(id);
  if (!ok) {
    return Response.json({ detail: "Generation not found" }, { status: 404 });
  }
  return Response.json({ deleted: true });
}
