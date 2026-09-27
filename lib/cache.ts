import fs from "node:fs";
import path from "node:path";
import { cacheCandidates } from "./storage-path";

type Entry<T> = { fetchedAt: string; data: T };

const memory = new Map<string, string>();
let resolved: { sig: string; dir: string | null } | null = null;

function signature(): string {
  return `${process.env.VERCEL ?? ""}\0${process.env.DATA_DIR ?? ""}`;
}

function writableDir(): string | null {
  const sig = signature();
  if (resolved?.sig === sig) return resolved.dir;
  let dir: string | null = null;
  for (const candidate of cacheCandidates()) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      const probe = path.join(candidate, `.probe-${process.pid}`);
      fs.writeFileSync(probe, "1");
      fs.unlinkSync(probe);
      dir = candidate;
      break;
    } catch {
      // Try the next location. A read-only DATA_DIR must not fail the glance.
    }
  }
  resolved = { sig, dir };
  return dir;
}

function parse<T>(raw: string): Entry<T> | null {
  try {
    const parsed = JSON.parse(raw) as Entry<T>;
    if (!parsed || typeof parsed.fetchedAt !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function resetCacheForTests() {
  memory.clear();
  resolved = null;
}

export function cacheDirectory(): string | null {
  return writableDir();
}

export function readCache<T>(key: string): Entry<T> | null {
  const dir = writableDir();
  if (dir) {
    try {
      const fromDisk = parse<T>(fs.readFileSync(path.join(dir, `${key}.json`), "utf8"));
      if (fromDisk) return fromDisk;
    } catch {
      // Missing file, or the directory stopped accepting reads.
    }
  }
  const cached = memory.get(key);
  return cached ? parse<T>(cached) : null;
}

export function writeCache<T>(key: string, data: T): Entry<T> {
  const entry: Entry<T> = { fetchedAt: new Date().toISOString(), data };
  const raw = JSON.stringify(entry);
  memory.set(key, raw);
  const dir = writableDir();
  if (dir) {
    try {
      fs.writeFileSync(path.join(dir, `${key}.json`), raw);
    } catch {
      // This instance still has the value in memory.
    }
  }
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
