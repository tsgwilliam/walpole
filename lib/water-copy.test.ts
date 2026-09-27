import assert from "node:assert/strict";
import test from "node:test";
import { londonDaySpan, waterGlanceLines } from "./water-copy.ts";

test("London day span counts civil dates, not raw hours", () => {
  assert.equal(londonDaySpan("2026-09-08T18:32:40.000Z", "2026-09-27T20:18:00.000Z"), 19);
  assert.equal(londonDaySpan("2026-09-27T01:00:00.000Z", "2026-09-27T20:00:00.000Z"), 0);
});

test("a clear feed with a last genuine end names the days", () => {
  const copy = waterGlanceLines({
    status: "clear",
    warning: false,
    forced: false,
    suppressed: false,
    lastReleaseEnd: "2026-09-08T18:32:40.000Z",
    nowIso: "2026-09-27T20:18:00.000Z",
  });
  assert.deepEqual(copy.lines, ["No current warnings", "No releases for 19 days"]);
  assert.equal(copy.warn, false);
});

test("one day stays singular", () => {
  const copy = waterGlanceLines({
    status: "clear",
    warning: false,
    forced: false,
    suppressed: false,
    lastReleaseEnd: "2026-09-26T12:00:00.000Z",
    nowIso: "2026-09-27T20:18:00.000Z",
  });
  assert.equal(copy.lines[1], "No releases for 1 day");
});

test("a missing release date is not turned into a number", () => {
  const copy = waterGlanceLines({
    status: "clear",
    warning: false,
    forced: false,
    suppressed: false,
    lastReleaseEnd: null,
    nowIso: "2026-09-27T20:18:00.000Z",
  });
  assert.deepEqual(copy.lines, ["No current warnings", "Last release date unknown"]);
});

test("an active release does not claim the water is clear", () => {
  const copy = waterGlanceLines({
    status: "active",
    warning: true,
    forced: false,
    suppressed: false,
    lastReleaseEnd: "2026-09-27T08:00:00.000Z",
    nowIso: "2026-09-27T20:18:00.000Z",
  });
  assert.deepEqual(copy.lines, ["Release in the last day", "Last release was today"]);
  assert.equal(copy.warn, true);
});
