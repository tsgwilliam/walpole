import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cacheDirectory, resetCacheForTests, writeCache } from "./cache.ts";
import { getConditions } from "./conditions.ts";
import {
  approvedObservations,
  currentDatabaseFile,
  readSettings,
  resetDbForTests,
} from "./db.ts";

const previousDataDir = process.env.DATA_DIR;
const previousVercel = process.env.VERCEL;

function restoreEnv() {
  if (previousDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = previousDataDir;
  if (previousVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = previousVercel;
}

function resetStores() {
  resetDbForTests();
  resetCacheForTests();
}

test("public conditions load when the database directory cannot be created", async () => {
  const appData = path.join(process.cwd(), "data");
  const before = fs.existsSync(appData) ? fs.readdirSync(appData).sort() : null;
  const blocker = path.join(os.tmpdir(), `walpole-notdir-${process.pid}`);
  let durable = "";
  fs.writeFileSync(blocker, "not a directory");

  try {
    durable = fs.mkdtempSync(path.join(process.cwd(), ".walpole-db-test-"));
    process.env.DATA_DIR = blocker;
    delete process.env.VERCEL;
    resetStores();

    const settings = readSettings();
    assert.equal(settings.wallTopMetresCD, 4);
    assert.equal(settings.overflowMetresCD, 3.85);
    assert.deepEqual(approvedObservations(), []);

    const opened = currentDatabaseFile();
    assert.ok(opened === ":memory:" || opened === path.join(os.tmpdir(), "walpole.sqlite"));
    assert.equal(fs.existsSync(path.join(blocker, "walpole.sqlite")), false);

    const entry = writeCache("readonly-probe", { ok: true });
    assert.equal(typeof entry.fetchedAt, "string");
    const cacheDir = cacheDirectory();
    if (cacheDir) {
      assert.equal(cacheDir.startsWith(path.resolve(os.tmpdir())), true);
      assert.equal(cacheDir.startsWith(blocker), false);
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    try {
      const sheet = await getConditions();
      assert.equal(sheet.place.name, "Walpole Bay Tidal Pool");
      assert.equal(sheet.settings.wallTopMetresCD, 4);
      assert.ok(Array.isArray(sheet.observations));
      assert.equal(sheet.observations.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }

    process.env.VERCEL = "1";
    process.env.DATA_DIR = appData;
    resetStores();
    readSettings();
    assert.equal(currentDatabaseFile(), path.join(os.tmpdir(), "walpole.sqlite"));
    assert.equal(fs.existsSync(path.join(appData, "walpole.sqlite")), false);
    writeCache("vercel-probe", { ok: true });
    const vercelCache = cacheDirectory();
    assert.ok(vercelCache);
    assert.equal(vercelCache.startsWith(path.resolve(process.cwd()) + path.sep), false);

    delete process.env.VERCEL;
    process.env.DATA_DIR = durable;
    resetStores();
    assert.equal(approvedObservations().length, 2);
    assert.equal(currentDatabaseFile(), path.join(durable, "walpole.sqlite"));
    assert.equal(fs.existsSync(path.join(durable, "walpole.sqlite")), true);
  } finally {
    resetStores();
    restoreEnv();
    fs.rmSync(blocker, { force: true });
    if (durable) fs.rmSync(durable, { recursive: true, force: true });
    const after = fs.existsSync(appData) ? fs.readdirSync(appData).sort() : null;
    assert.deepEqual(after, before);
  }
});
