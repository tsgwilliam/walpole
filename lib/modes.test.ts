import assert from "node:assert/strict";
import test from "node:test";
import { glanceMode, modeEndAt, modeRemainingLine } from "./modes.ts";

test("three glance modes cover the wall enum", () => {
  assert.equal(glanceMode("exposed"), "pool");
  assert.equal(glanceMode("near_top"), "pool");
  assert.equal(glanceMode("waterfall"), "waterfall");
  assert.equal(glanceMode("covered"), "sea");
});

test("pool mode runs through near-the-top until the waterfall", () => {
  const changes = [
    { at: "2026-09-27T10:00:00.000Z", state: "exposed" as const },
    { at: "2026-09-27T18:00:00.000Z", state: "near_top" as const },
    { at: "2026-09-27T20:00:00.000Z", state: "waterfall" as const },
    { at: "2026-09-27T20:15:00.000Z", state: "covered" as const },
  ];
  assert.equal(
    modeEndAt("exposed", changes, "2026-09-27T16:00:00.000Z"),
    "2026-09-27T20:00:00.000Z",
  );
  assert.equal(
    modeRemainingLine("pool", "2026-09-27T18:00:00.000Z", "2026-09-27T16:00:00.000Z"),
    "Pool mode active for another 2 hours",
  );
});

test("waterfall and sea end on the next other mode", () => {
  const changes = [
    { at: "2026-09-27T20:00:00.000Z", state: "waterfall" as const },
    { at: "2026-09-27T20:14:00.000Z", state: "near_top" as const },
    { at: "2026-09-27T20:40:00.000Z", state: "covered" as const },
    { at: "2026-09-27T23:10:00.000Z", state: "exposed" as const },
  ];
  assert.equal(
    modeEndAt("waterfall", changes, "2026-09-27T20:02:00.000Z"),
    "2026-09-27T20:14:00.000Z",
  );
  assert.equal(
    modeRemainingLine("waterfall", "2026-09-27T20:14:00.000Z", "2026-09-27T20:02:00.000Z"),
    "Magic waterfall active for another 12 minutes",
  );
  assert.equal(
    modeEndAt("covered", changes, "2026-09-27T21:00:00.000Z"),
    "2026-09-27T23:10:00.000Z",
  );
  assert.equal(
    modeRemainingLine("sea", null, "2026-09-27T21:00:00.000Z"),
    "Sea mode active for the rest of today",
  );
});
