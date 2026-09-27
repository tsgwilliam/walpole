import fs from "node:fs";
import path from "node:path";

type Entry<T> = { fetchedAt: string; data: T };

function fileFor(key: string): string {
  const dir = path.join(process.cwd(), "data", "cache");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}

export function readCache<T>(key: string): Entry<T> | null {
  try {
    const raw = fs.readFileSync(fileFor(key), "utf8");
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.fetchedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): Entry<T> {
  const entry = { fetchedAt: new Date().toISOString(), data };
  fs.writeFileSync(fileFor(key), JSON.stringify(entry));
  return entry;
}

export async function loadCached<T>(
  key: string,
  ttlMs: number,
  fresh: boolean,
  loader: () => Promise<T>,
): Promise<{ data: T; fetchedAt: string; stale: boolean } | null> {
  const cached = readCache<T>(key);
  const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity;
  if (cached && !fresh && age < ttlMs) {
    return { data: cached.data, fetchedAt: cached.fetchedAt, stale: false };
  }
  try {
    const data = await loader();
    const saved = writeCache(key, data);
    return { data: saved.data, fetchedAt: saved.fetchedAt, stale: false };
  } catch {
    if (cached) return { data: cached.data, fetchedAt: cached.fetchedAt, stale: true };
    return null;
  }
}
