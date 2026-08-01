import { promises as fs } from "fs";
import path from "path";

export interface StoreEntry {
  key: string;
  size: number;
  lastModified: string | null;
}

export class DiskStore {
  constructor(private root: string = process.env.DATA_DIR ?? "data") {}

  private resolve(key: string): string {
    const clean = key.replace(/^\/+/, "");
    const base = path.resolve(this.root);
    const abs = path.resolve(base, clean);
    if (abs !== base && !abs.startsWith(base + path.sep)) {
      throw new Error(`Invalid store key: ${key}`);
    }
    return abs;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const abs = this.resolve(key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await fs.unlink(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async deletePrefix(prefix: string): Promise<void> {
    const abs = this.resolve(prefix);
    try {
      await fs.rm(abs, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  async list(prefix: string): Promise<StoreEntry[]> {
    const abs = this.resolve(prefix);
    let relPaths: string[];
    try {
      relPaths = await fs.readdir(abs, { recursive: true });
    } catch {
      return [];
    }
    const entries: StoreEntry[] = [];
    for (const rel of relPaths) {
      const full = path.join(abs, rel);
      let st;
      try {
        st = await fs.stat(full);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      entries.push({
        key: path.join(prefix, rel),
        size: st.size,
        lastModified: st.mtime.toISOString(),
      });
    }
    return entries;
  }

  url(key: string): string {
    return `/api/assets/${key}`;
  }

  keyFromUrl(url: string): string | null {
    const prefix = "/api/assets/";
    if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length));
    return null;
  }
}

export const store = new DiskStore();
