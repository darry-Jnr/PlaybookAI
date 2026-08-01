import { listFiles, readFile, removeDir, removeFile, saveFile } from "./files";
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
  await saveFile(
    historyKey(sessionId, entry.id),
    Buffer.from(JSON.stringify(entry, null, 2)),
  );
}

export async function getGeneration(id: string): Promise<HistoryEntry | null> {
  const files = await listFiles("history/");
  const target = files.find((key) => key.endsWith(`/${id}.json`));
  if (!target) return null;
  const buf = await readFile(target);
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
  const files = await listFiles(`history/${sanitize(sessionId)}/`);
  const entries: HistoryEntry[] = [];
  for (const key of files) {
    if (!key.endsWith(".json")) continue;
    const buf = await readFile(key);
    if (!buf) continue;
    try {
      entries.push(JSON.parse(buf.toString("utf-8")) as HistoryEntry);
    } catch {
      // skip files that are half-written or corrupt
    }
  }
  return entries.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const files = await listFiles("history/");
  const target = files.find((key) => key.endsWith(`/${id}.json`));
  if (!target) return false;
  await removeFile(target);
  await removeDir(`generations/${id}/`);
  return true;
}

export async function updateGenerationAssets(
  id: string,
  assets: AssetsMap,
): Promise<void> {
  const entry = await getGeneration(id);
  if (!entry) return;
  entry.assets = assets;
  const files = await listFiles("history/");
  const target = files.find((key) => key.endsWith(`/${id}.json`));
  if (!target) return;
  await saveFile(target, Buffer.from(JSON.stringify(entry, null, 2)));
}

export async function loadSpec(id: string): Promise<BookSpec | null> {
  const buf = await readFile(`generations/${id}/book.json`);
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
  const files = await listFiles(`generations/${id}/`);
  const images: Record<string, Buffer> = {};
  for (const key of files) {
    const name = key.split("/").pop() ?? "";
    if (name === "book.json") continue;
    const assetName = name.replace(/\.(png|jpe?g)$/i, "");
    const buf = await readFile(key);
    if (buf) images[assetName] = buf;
  }
  return images;
}
