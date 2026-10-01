import fs from "node:fs";
import path from "node:path";
import { DEFAULT_WALL } from "./constants";
import { blockedWriteDir, isEphemeralDatabaseFile, sqliteCandidates } from "./storage-path";

type SqliteDatabase = {
  exec: (sql: string) => void;
  close: () => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => { changes: number; lastInsertRowid: number | bigint };
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
};

type SqliteModule = {
  DatabaseSync: new (path: string) => SqliteDatabase;
};

type Row = Record<string, unknown>;

type Statement = {
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number };
  get: (...params: unknown[]) => Row | undefined;
  all: (...params: unknown[]) => Row[];
};

export type Db = {
  exec: (sql: string) => void;
  prepare: (sql: string) => Statement;
};

const globalDb = globalThis as unknown as {
  __walpoleDb?: Db;
  __walpoleRaw?: SqliteDatabase;
  __walpoleDbFile?: string;
};

function wrap(db: SqliteDatabase): Db {
  return {
    exec: (sql) => db.exec(sql),
    prepare: (sql) => {
      const stmt = db.prepare(sql);
      return {
        run: (...params) => {
          const result = stmt.run(...params);
          return {
            changes: Number(result.changes),
            lastInsertRowid: Number(result.lastInsertRowid),
          };
        },
        get: (...params) => {
          const row = stmt.get(...params);
          if (!row || typeof row !== "object") return undefined;
          return { ...(row as Row) };
        },
        all: (...params) =>
          stmt.all(...params).map((row: unknown) => ({ ...(row as Row) })),
      };
    },
  };
}

function migrate(db: Db, file: string) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
      reviewed_at TEXT,
      wall_state TEXT NOT NULL,
      when_seen TEXT NOT NULL,
      where_pool TEXT NOT NULL,
      conditions_feel TEXT NOT NULL,
      water_temp_feel TEXT,
      wind_feel TEXT,
      clarity TEXT,
      crowd TEXT,
      wildlife TEXT,
      swim_again TEXT,
      predicted_height_m REAL,
      predicted_state TEXT,
      model_wall_top_m REAL,
      model_overflow_m REAL,
      is_seed INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS observations_status_created
      ON observations(status, created_at DESC);
  `);

  const count = db.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number };
  if (Number(count?.n ?? 0) === 0) {
    const seed: Record<string, string> = {
      wallTopMetresCD: String(DEFAULT_WALL.wallTopMetresCD),
      overflowMetresCD: String(DEFAULT_WALL.overflowMetresCD),
      approachBandMetres: String(DEFAULT_WALL.approachBandMetres),
      waterfallWindowMinutes: String(DEFAULT_WALL.waterfallWindowMinutes),
      waveAllowanceMetres: String(DEFAULT_WALL.waveAllowanceMetres),
      pollutionOverride: "auto",
    };
    const insert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(seed)) insert.run(key, value);
  }

  adoptWorkingCrest(db);

  // Demo plates are for a durable local file. An ephemeral database would
  // show the same two approved notes again after every cold start.
  if (isEphemeralDatabaseFile(file)) return;
  const notes = db.prepare("SELECT COUNT(*) AS n FROM observations").get() as { n: number };
  if (Number(notes?.n ?? 0) === 0) seedObservations(db);
}

/**
 * The first seed was a round 4.00 m crest and 3.85 m overflow. If that pair
 * is still stored untouched, move it to the working crest. A keeper who
 * edited either number is left alone.
 */
function adoptWorkingCrest(db: Db) {
  const top = db.prepare("SELECT value FROM settings WHERE key = ?").get("wallTopMetresCD") as
    | { value: string }
    | undefined;
  const over = db.prepare("SELECT value FROM settings WHERE key = ?").get("overflowMetresCD") as
    | { value: string }
    | undefined;
  const topN = Number(top?.value);
  const overN = Number(over?.value);
  if (!(Math.abs(topN - 4) < 1e-9 && Math.abs(overN - 3.85) < 1e-9)) return;
  const update = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
  update.run(String(DEFAULT_WALL.wallTopMetresCD), "wallTopMetresCD");
  update.run(String(DEFAULT_WALL.overflowMetresCD), "overflowMetresCD");
}

function iso(offsetMs: number) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function seedObservations(db: Db) {
  const insert = db.prepare(`
    INSERT INTO observations (
      created_at, status, reviewed_at, wall_state, when_seen, where_pool, conditions_feel,
      water_temp_feel, wind_feel, clarity, crowd, wildlife, swim_again,
      predicted_height_m, predicted_state, model_wall_top_m, model_overflow_m, is_seed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  insert.run(
    iso(-5 * 3600 * 1000),
    "approved",
    iso(-5 * 3600 * 1000 + 60_000),
    "exposed",
    "earlier_today",
    "landward",
    "inviting",
    "cold",
    "breeze",
    "clear",
    "few",
    "birds",
    "yes",
    null,
    null,
    DEFAULT_WALL.wallTopMetresCD,
    DEFAULT_WALL.overflowMetresCD,
  );
  insert.run(
    iso(-30 * 3600 * 1000),
    "approved",
    iso(-29 * 3600 * 1000),
    "waterfall",
    "just_now",
    "seaward",
    "choppy",
    "fresh",
    "windy",
    "cloudy",
    "busy",
    "none",
    "yes",
    null,
    null,
    DEFAULT_WALL.wallTopMetresCD,
    DEFAULT_WALL.overflowMetresCD,
  );
  insert.run(
    iso(-25 * 60 * 1000),
    "pending",
    null,
    "covered",
    "last_15_30",
    "middle",
    "rough",
    "biting",
    "hard",
    "murky",
    "few",
    "jellyfish",
    "no",
    null,
    null,
    DEFAULT_WALL.wallTopMetresCD,
    DEFAULT_WALL.overflowMetresCD,
  );
}

const SQLITE_MISSING = "This app needs Node.js 22, which provides the built-in SQLite module.";

function openSqlite(file: string): SqliteDatabase {
  const getBuiltin = (process as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
  if (typeof getBuiltin !== "function") {
    throw new Error(SQLITE_MISSING);
  }
  const loaded = getBuiltin("node:" + "sqlite") as Partial<SqliteModule> | undefined;
  const DatabaseSync = loaded?.DatabaseSync;
  if (!DatabaseSync) {
    throw new Error(SQLITE_MISSING);
  }
  return new DatabaseSync(file);
}

function openResilient(): { sqlite: SqliteDatabase; file: string } {
  let missing: Error | null = null;
  for (const file of sqliteCandidates()) {
    try {
      if (file !== ":memory:") {
        const dir = path.dirname(file);
        if (blockedWriteDir(dir)) {
          throw new Error("Refusing to create a database under the app directory.");
        }
        fs.mkdirSync(dir, { recursive: true });
      }
      const sqlite = openSqlite(file);
      if (file !== ":memory:") {
        try {
          sqlite.exec("PRAGMA journal_mode = WAL;");
        } catch {
          // Some filesystems reject WAL. The default journal still stores the rows.
        }
      }
      return { sqlite, file };
    } catch (error) {
      if (error instanceof Error && error.message === SQLITE_MISSING) missing = error;
    }
  }
  if (missing) throw missing;
  throw new Error("Could not open a SQLite database.");
}

/** Path actually opened, or `:memory:` when no directory would accept the file. */
export function currentDatabaseFile(): string | null {
  return globalDb.__walpoleDbFile ?? null;
}

export function resetDbForTests() {
  try {
    globalDb.__walpoleRaw?.close();
  } catch {
    // Already closed.
  }
  delete globalDb.__walpoleDb;
  delete globalDb.__walpoleRaw;
  delete globalDb.__walpoleDbFile;
}

export function getDb(): Db {
  if (globalDb.__walpoleDb) return globalDb.__walpoleDb;
  const { sqlite, file } = openResilient();
  const db = wrap(sqlite);
  try {
    migrate(db, file);
  } catch (error) {
    try {
      sqlite.close();
    } catch {
      // The failed file is left for the next attempt to replace.
    }
    throw error;
  }
  globalDb.__walpoleDb = db;
  globalDb.__walpoleRaw = sqlite;
  globalDb.__walpoleDbFile = file;
  return db;
}

export type PollutionOverride = "auto" | "force_warning" | "suppress_warning";

export type StoredSettings = {
  wallTopMetresCD: number;
  overflowMetresCD: number;
  approachBandMetres: number;
  waterfallWindowMinutes: number;
  waveAllowanceMetres: number;
  pollutionOverride: PollutionOverride;
};

export function defaultSettings(): StoredSettings {
  return {
    wallTopMetresCD: DEFAULT_WALL.wallTopMetresCD,
    overflowMetresCD: DEFAULT_WALL.overflowMetresCD,
    approachBandMetres: DEFAULT_WALL.approachBandMetres,
    waterfallWindowMinutes: DEFAULT_WALL.waterfallWindowMinutes,
    waveAllowanceMetres: DEFAULT_WALL.waveAllowanceMetres,
    pollutionOverride: "auto",
  };
}

export function readSettings(): StoredSettings {
  let db: Db;
  try {
    db = getDb();
  } catch {
    return defaultSettings();
  }
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const num = (key: string, fallback: number) => {
    const n = Number(map[key]);
    return Number.isFinite(n) ? n : fallback;
  };
  const override = map.pollutionOverride;
  const pollutionOverride: PollutionOverride =
    override === "force_warning" || override === "suppress_warning" ? override : "auto";
  return {
    wallTopMetresCD: num("wallTopMetresCD", DEFAULT_WALL.wallTopMetresCD),
    overflowMetresCD: num("overflowMetresCD", DEFAULT_WALL.overflowMetresCD),
    approachBandMetres: num("approachBandMetres", DEFAULT_WALL.approachBandMetres),
    waterfallWindowMinutes: num("waterfallWindowMinutes", DEFAULT_WALL.waterfallWindowMinutes),
    waveAllowanceMetres: num("waveAllowanceMetres", DEFAULT_WALL.waveAllowanceMetres),
    pollutionOverride,
  };
}

export function writeSettings(next: StoredSettings) {
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const entries: [string, string][] = [
    ["wallTopMetresCD", String(next.wallTopMetresCD)],
    ["overflowMetresCD", String(next.overflowMetresCD)],
    ["approachBandMetres", String(next.approachBandMetres)],
    ["waterfallWindowMinutes", String(next.waterfallWindowMinutes)],
    ["waveAllowanceMetres", String(next.waveAllowanceMetres)],
    ["pollutionOverride", next.pollutionOverride],
  ];
  for (const [key, value] of entries) upsert.run(key, value);
}

export type ObservationRow = {
  id: number;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  wall_state: string;
  when_seen: string;
  where_pool: string;
  conditions_feel: string;
  water_temp_feel: string | null;
  wind_feel: string | null;
  clarity: string | null;
  crowd: string | null;
  wildlife: string | null;
  swim_again: string | null;
  predicted_height_m: number | null;
  predicted_state: string | null;
  model_wall_top_m: number | null;
  model_overflow_m: number | null;
  is_seed: number;
};

export function listObservations(status?: ObservationRow["status"]): ObservationRow[] {
  const db = getDb();
  if (status) {
    return db
      .prepare("SELECT * FROM observations WHERE status = ? ORDER BY created_at DESC")
      .all(status) as ObservationRow[];
  }
  return db.prepare("SELECT * FROM observations ORDER BY created_at DESC").all() as ObservationRow[];
}

export function approvedObservations(limit = 8): ObservationRow[] {
  try {
    const db = getDb();
    return db
      .prepare("SELECT * FROM observations WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?")
      .all(limit) as ObservationRow[];
  } catch {
    return [];
  }
}

export function insertObservation(
  input: Omit<
    ObservationRow,
    "id" | "created_at" | "status" | "reviewed_at" | "is_seed"
  >,
): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO observations (
        created_at, status, wall_state, when_seen, where_pool, conditions_feel,
        water_temp_feel, wind_feel, clarity, crowd, wildlife, swim_again,
        predicted_height_m, predicted_state, model_wall_top_m, model_overflow_m, is_seed
      ) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(
      new Date().toISOString(),
      input.wall_state,
      input.when_seen,
      input.where_pool,
      input.conditions_feel,
      input.water_temp_feel,
      input.wind_feel,
      input.clarity,
      input.crowd,
      input.wildlife,
      input.swim_again,
      input.predicted_height_m,
      input.predicted_state,
      input.model_wall_top_m,
      input.model_overflow_m,
    );
  return result.lastInsertRowid;
}

export function reviewObservation(id: number, status: "approved" | "rejected"): boolean {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE observations SET status = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'",
    )
    .run(status, new Date().toISOString(), id);
  return result.changes > 0;
}

export function observationsToCsv(rows: ObservationRow[]): string {
  const headers = [
    "id",
    "created_at",
    "status",
    "reviewed_at",
    "wall_state",
    "when_seen",
    "where_pool",
    "conditions_feel",
    "water_temp_feel",
    "wind_feel",
    "clarity",
    "crowd",
    "wildlife",
    "swim_again",
    "predicted_height_m",
    "predicted_state",
    "model_wall_top_m",
    "model_overflow_m",
    "is_seed",
  ] as const;
  const esc = (value: unknown) => {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(","));
  }
  return lines.join("\n") + "\n";
}
