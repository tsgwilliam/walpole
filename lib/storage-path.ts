import os from "node:os";
import path from "node:path";

const TEMP_SQLITE = () => path.join(os.tmpdir(), "walpole.sqlite");
const TEMP_CACHE = () => path.join(os.tmpdir(), "walpole-cache");

/** Vercel sets this. The deployment filesystem is read-only outside /tmp. */
export function onVercel(): boolean {
  return process.env.VERCEL === "1";
}

function dataDirOverride(): string | null {
  const value = process.env.DATA_DIR?.trim();
  return value ? path.resolve(value) : null;
}

/** True when `dir` is the app directory or a folder inside it. */
export function isUnderAppRoot(dir: string): boolean {
  const root = path.resolve(process.cwd());
  const target = path.resolve(dir);
  return target === root || target.startsWith(root + path.sep);
}

/**
 * On Vercel, refuse any path inside the deployed app. Writes there throw
 * at runtime. Local development may still use `data/` under the repo.
 */
export function blockedWriteDir(dir: string): boolean {
  return onVercel() && isUnderAppRoot(dir);
}

export function preferredSqliteFile(): string {
  const override = dataDirOverride();
  if (override) return path.join(override, "walpole.sqlite");
  if (onVercel()) return TEMP_SQLITE();
  return path.join(process.cwd(), "data", "walpole.sqlite");
}

export function preferredCacheDir(): string {
  const override = dataDirOverride();
  if (override) return path.join(override, "cache");
  if (onVercel()) return TEMP_CACHE();
  return path.join(process.cwd(), "data", "cache");
}

function samePath(a: string, b: string): boolean {
  return path.resolve(a) === path.resolve(b);
}

/** File locations to try, then `:memory:` if none of them can be created. */
export function sqliteCandidates(): string[] {
  const preferred = preferredSqliteFile();
  const temp = TEMP_SQLITE();
  const files: string[] = [];
  if (!blockedWriteDir(path.dirname(preferred))) files.push(preferred);
  if (!samePath(preferred, temp) && !blockedWriteDir(path.dirname(temp))) files.push(temp);
  files.push(":memory:");
  return files;
}

export function cacheCandidates(): string[] {
  const preferred = preferredCacheDir();
  const temp = TEMP_CACHE();
  const dirs: string[] = [];
  if (!blockedWriteDir(preferred)) dirs.push(preferred);
  if (!samePath(preferred, temp) && !blockedWriteDir(temp)) dirs.push(temp);
  return dirs;
}

/** Ephemeral files are recreated empty. Skip the local demo notes there. */
export function isEphemeralDatabaseFile(file: string): boolean {
  if (file === ":memory:") return true;
  const tmp = path.resolve(os.tmpdir());
  const resolved = path.resolve(file);
  return resolved === tmp || resolved.startsWith(tmp + path.sep);
}
