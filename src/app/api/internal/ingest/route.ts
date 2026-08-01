import { NextRequest } from "next/server";
import { saveFile } from "@/lib/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (!secret || req.headers.get("x-ingest-secret") !== secret) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const genId = typeof body?.genId === "string" ? body.genId : "";
  const name = typeof body?.name === "string" ? body.name : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (!genId || !name || !data) {
    return Response.json({ detail: "Missing fields" }, { status: 422 });
  }

  const buf = Buffer.from(data, "base64");
  if (buf.length === 0 || buf.length > MAX_BYTES) {
    return Response.json({ detail: "Payload too large" }, { status: 422 });
  }

  await saveFile(`generations/${genId}/${name}.png`, buf);
  return Response.json({ ok: true });
}
