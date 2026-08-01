import type { StreamEvent } from "./types";

export function sse(payload: StreamEvent): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  hint?: string,
  retryable = false,
) {
  return Response.json(
    { detail: { code, retryable, message, hint: hint ?? "" } },
    { status },
  );
}

export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
