import { NextRequest } from "next/server";
import { listGenerations } from "@/lib/history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId) {
    return Response.json({ generations: [] });
  }
  const gens = await listGenerations(sessionId);
  return Response.json({
    generations: gens.map((g) => ({
      id: g.id,
      prompt: g.prompt,
      title: g.title,
      summary: g.summary ?? g.prompt,
      plan_key: g.plan_key,
      created_at: g.created_at,
    })),
  });
}
