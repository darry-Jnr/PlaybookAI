import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let storageOk = false;
  try {
    await store.put("__playbook_health_probe__", Buffer.from("ok"));
    storageOk = true;
  } catch {
    storageOk = false;
  }
  return Response.json({
    status: storageOk ? "healthy" : "degraded",
    storage_connected: storageOk,
    groq_key_present: Boolean(process.env.GROQ_API_KEY),
    cf_key_present: Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN),
    elevenlabs_key_present: Boolean(process.env.ELEVENLABS_API_KEY),
  });
}
