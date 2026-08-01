import type { StreamEvent } from "./types";

export function sse(payload: StreamEvent): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
