import assert from "node:assert/strict";
import test from "node:test";
import { splitTideAt, tideCurveForDay, tideWavePath } from "./tide-curve.ts";

const points = [
  { t: "2026-10-01T22:00:00.000Z", h: 1 },
  { t: "2026-10-01T22:30:00.000Z", h: 1.5 },
  { t: "2026-10-01T23:00:00.000Z", h: 2 },
  { t: "2026-10-01T23:30:00.000Z", h: 2.4 },
  { t: "2026-10-02T11:00:00.000Z", h: 4 },
  { t: "2026-10-02T23:30:00.000Z", h: 0.4 },
];

test("the curve keeps one London day and follows the scrubbed clock", () => {
  const evening = tideCurveForDay(points, "2026-10-01T21:00:00.000Z", []);
  assert.equal(evening.dayKey, "2026-10-01");
  assert.deepEqual(
    evening.points.map((point) => point.h),
    [1, 1.5],
  );
  const split = splitTideAt(evening.points, "2026-10-01T22:15:00.000Z");
  assert.equal(split.past.at(-1)?.h, 1.25);
  assert.equal(split.future[0]?.h, 1.25);
  assert.equal(split.past.length, 2);
  assert.equal(split.future.length, 2);

  const morning = tideCurveForDay(points, "2026-10-02T08:00:00.000Z", []);
  assert.equal(morning.dayKey, "2026-10-02");
  assert.deepEqual(
    morning.points.map((point) => point.h),
    [2, 2.4, 4],
  );
  const later = splitTideAt(morning.points, "2026-10-02T08:00:00.000Z");
  assert.ok((later.past.at(-1)?.h ?? 0) > 2.4);
  assert.equal(later.future.at(-1)?.h, 4);
  assert.ok(!later.past.some((point) => point.h === 1));
});

test("a waterfall window is clipped to the scrubbed day", () => {
  const windows = [
    { start: "2026-10-01T22:30:00.000Z", end: "2026-10-01T23:20:00.000Z" },
    { start: "2026-10-03T10:00:00.000Z", end: "2026-10-03T10:15:00.000Z" },
  ];
  const day = tideCurveForDay(points, "2026-10-02T08:00:00.000Z", windows);
  assert.equal(day.windows.length, 1);
  assert.equal(day.windows[0].start, "2026-10-01T23:00:00.000Z");
  assert.equal(day.windows[0].end, "2026-10-01T23:20:00.000Z");
});

test("the wave path passes through the heights", () => {
  const path = tideWavePath([
    { x: 0, y: 10 },
    { x: 10, y: 0 },
    { x: 20, y: 8 },
    { x: 30, y: 2 },
  ]);
  assert.match(path, /^M 0\.0 10\.0 C/);
  assert.match(path, /10\.0 0\.0/);
  assert.match(path, /30\.0 2\.0$/);
  assert.equal(
    tideWavePath([
      { x: 0, y: 1 },
      { x: 4, y: 2 },
    ]),
    "M 0.0 1.0 L 4.0 2.0",
  );
});
