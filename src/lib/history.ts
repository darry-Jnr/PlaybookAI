import { store } from "./store";
import type { AssetsMap, BookSpec, HistoryEntry } from "./types";

function historyKey(sessionId: string, id: string): string {
  return `history/${sanitize(sessionId)}/${id}.json`;
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export async function saveGeneration(
  sessionId: string,
  entry: HistoryEntry,
): Promise<void> {
  await store.put(
    historyKey(sessionId, entry.id),
    Buffer.from(JSON.stringify(entry, null, 2)),
  );
}

export async function getGeneration(id: string): Promise<HistoryEntry | null> {
  const files = await store.list(`history/`);
  const target = files.find((e) => e.key.endsWith(`/${id}.json`));
  if (!target) return null;
  const buf = await store.get(target.key);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf-8")) as HistoryEntry;
  } catch {
    return null;
  }
}

export async function listGenerations(
  sessionId: string,
): Promise<HistoryEntry[]> {
  const files = await store.list(`history/${sanitize(sessionId)}/`);
  const entries: HistoryEntry[] = [];
  for (const file of files) {
    if (!file.key.endsWith(".json")) continue;
    const buf = await store.get(file.key);
    if (!buf) continue;
    try {
      entries.push(JSON.parse(buf.toString("utf-8")) as HistoryEntry);
    } catch {
      // ignore corrupt history files
    }
  }
  return entries.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const files = await store.list(`history/`);
  const target = files.find((e) => e.key.endsWith(`/${id}.json`));
  if (!target) return false;
  await store.delete(target.key);
  await store.deletePrefix(`generations/${id}/`);
  return true;
}

export async function updateGenerationAssets(
  id: string,
  assets: AssetsMap,
): Promise<void> {
  const entry = await getGeneration(id);
  if (!entry) return;
  entry.assets = assets;
  const files = await store.list(`history/`);
  const target = files.find((e) => e.key.endsWith(`/${id}.json`));
  if (!target) return;
  await store.put(target.key, Buffer.from(JSON.stringify(entry, null, 2)));
}

export async function loadSpec(id: string): Promise<BookSpec | null> {
  const buf = await store.get(`generations/${id}/book.json`);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf-8")) as BookSpec;
  } catch {
    return null;
  }
}

export async function collectImages(
  id: string,
): Promise<Record<string, Buffer>> {
  const files = await store.list(`generations/${id}/`);
  const images: Record<string, Buffer> = {};
  for (const file of files) {
    const name = file.key.split("/").pop() ?? "";
    if (name === "book.json") continue;
    const assetName = name.replace(/\.(png|jpe?g)$/i, "");
    const buf = await store.get(file.key);
    if (buf) images[assetName] = buf;
  }
  return images;
}

export async function generationExists(id: string): Promise<boolean> {
  return store.exists(`generations/${id}/book.json`);
}
