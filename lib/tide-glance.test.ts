import assert from "node:assert/strict";
import test from "node:test";
import { glanceTideDays, recentTidePeak, selectGlanceTide, tideExtremesLine, tideTrend } from "./tide-glance.ts";

const now = "2026-10-01T12:00:00.000Z";

test("tide trend reads the height about three quarters of an hour back", () => {
  const points = [
    { t: "2026-10-01T10:30:00.000Z", h: 2.1 },
    { t: "2026-10-01T11:15:00.000Z", h: 2.4 },
    { t: "2026-10-01T12:30:00.000Z", h: 3.1 },
  ];
  assert.equal(tideTrend(points, now, 2.7), "rising");
  assert.equal(tideTrend(points, now, 2.2), "falling");
  assert.equal(tideTrend(points, now, 2.41), "steady");
  assert.equal(tideTrend([], now, 2.7), "steady");
});

test("recent peak is the highest sample in the last eight hours", () => {
  const points = [
    { t: "2026-10-01T02:00:00.000Z", h: 4.8 },
    { t: "2026-10-01T06:00:00.000Z", h: 4.2 },
    { t: "2026-10-01T11:00:00.000Z", h: 3.1 },
    { t: "2026-10-01T13:00:00.000Z", h: 9 },
  ];
  assert.equal(recentTidePeak(points, now), 4.2);
  assert.equal(recentTidePeak([], now), null);
});

test("the glance keeps the last 12 hours and the next two days of tide", () => {
  const now = new Date("2026-10-01T18:00:00.000Z");
  const span = selectGlanceTide(
    [
      { t: "2026-10-01T05:00:00.000Z", h: 1 },
      { t: "2026-10-01T10:00:00.000Z", h: 2 },
      { t: "2026-10-02T18:00:00.000Z", h: 3 },
      { t: "2026-10-03T20:00:00.000Z", h: 4 },
    ],
    [
      { t: "2026-10-01T08:00:00.000Z", h: 0.8, kind: "low" as const },
      { t: "2026-10-02T08:00:00.000Z", h: 4.6, kind: "high" as const },
      { t: "2026-10-04T08:00:00.000Z", h: 0.4, kind: "low" as const },
    ],
    now,
  );
  assert.deepEqual(span.points.map((point) => point.h), [2, 3]);
  assert.deepEqual(span.events.map((event) => event.h), [0.8, 4.6]);
  assert.equal(glanceTideDays(now).has("2026-10-01"), true);
  assert.equal(glanceTideDays(now).has("2026-10-02"), true);
});

test("highs and lows share one short line", () => {
  assert.equal(tideExtremesLine([]), null);
  assert.equal(
    tideExtremesLine([
      { t: "2026-10-01T14:05:00.000Z", h: 4.62, kind: "high" },
      { t: "2026-10-01T08:10:00.000Z", h: 0.84, kind: "low" },
    ]),
    "Low 09:10 · 0.8 m · High 15:05 · 4.6 m",
  );
});
