import { promises as fs } from "fs";
import path from "path";

// everything lives under data/ — one folder per generation
const ROOT = path.resolve(process.env.DATA_DIR ?? "data");

function resolve(key: string): string {
  return path.join(ROOT, key);
}

export async function saveFile(key: string, data: Buffer): Promise<void> {
  const abs = resolve(key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}

export async function readFile(key: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(resolve(key));
  } catch {
    return null;
  }
}

export async function removeFile(key: string): Promise<boolean> {
  try {
    await fs.unlink(resolve(key));
    return true;
  } catch {
    return false;
  }
}

export async function removeDir(prefix: string): Promise<void> {
  try {
    await fs.rm(resolve(prefix), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const base = prefix.replace(/\/+$/, "");
    const abs = resolve(base);
    const rels = await fs.readdir(abs, { recursive: true });
    const keys: string[] = [];
    for (const rel of rels) {
      const full = path.join(abs, rel);
      let st;
      try {
        st = await fs.stat(full);
      } catch {
        continue;
      }
      if (st.isFile()) keys.push(`${base}/${rel}`);
    }
    return keys;
  } catch {
    return [];
  }
}

export function assetUrl(key: string): string {
  return `/api/assets/${key}`;
}
