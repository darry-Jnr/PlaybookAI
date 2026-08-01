import type { BookSpec, HistoryEntry, StreamEvent } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

function sessionId(): string {
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("session_id", sid);
  }
  return sid;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-session-id": sessionId() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail?.message || `API error ${res.status}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "x-session-id": sessionId() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail?.message || `API error ${res.status}`);
  }
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: { "x-session-id": sessionId() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail?.message || `API error ${res.status}`);
  }
  return res.json();
}

export async function planStorybook(prompt: string): Promise<{ spec: BookSpec; plan_key: string; generation_id?: string }> {
  return post("/plan", { prompt, vendor: "groq" });
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const data = await get<{ generations: HistoryEntry[] }>("/history");
  return data.generations;
}

export async function fetchGeneration(id: string): Promise<HistoryEntry> {
  return get(`/history/${id}`);
}

export async function deleteGeneration(id: string): Promise<void> {
  await del(`/history/${id}`);
}

export async function* generateStream(prompt: string, spec?: BookSpec, generation_id?: string): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-session-id": sessionId() },
    body: JSON.stringify({ prompt, spec, generation_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail?.message || `API error ${res.status}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const m = part.match(/^data: (.+)/);
      if (m) {
        yield JSON.parse(m[1]) as StreamEvent;
      }
    }
  }
}

export async function downloadBook(generationId: string, format: "pdf" | "epub"): Promise<void> {
  const res = await fetch(`${API}/generations/${generationId}/download/${format}`, {
    method: "POST",
    headers: { "x-session-id": sessionId() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || `Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cd = res.headers.get("content-disposition") ?? "";
  const match = cd.match(/filename="(.+?)"/);
  a.href = url;
  a.download = match?.[1] ?? `storybook.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
