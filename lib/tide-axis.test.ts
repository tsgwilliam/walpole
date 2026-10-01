import assert from "node:assert/strict";
import test from "node:test";
import {
  TIDE_NOW_FRAC,
  TIDE_WINDOW_MS,
  tideNowPlotX,
  tidePlotX,
  tideVisibleWindow,
} from "./tide-axis.ts";

test("the visible strip is always twenty-four hours with now at twenty per cent", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");
  const window = tideVisibleWindow(now);
  assert.equal(window.spanMs, TIDE_WINDOW_MS);
  assert.equal(window.startMs, now - TIDE_NOW_FRAC * TIDE_WINDOW_MS);
  assert.equal(tidePlotX(now, window, 10, 200), tideNowPlotX(10, 200));
  const later = tideVisibleWindow(now + 6 * 3_600_000);
  assert.equal(tidePlotX(now + 6 * 3_600_000, later, 10, 200), tideNowPlotX(10, 200));
});

test("scrubbing slides the curve under a fixed now line", () => {
  const innerW = 300;
  const padL = 12;
  const fixed = tideNowPlotX(padL, innerW);
  const w0 = tideVisibleWindow(Date.parse("2026-10-01T08:00:00.000Z"));
  const w1 = tideVisibleWindow(Date.parse("2026-10-01T20:00:00.000Z"));
  const sample = Date.parse("2026-10-01T14:00:00.000Z");
  const x0 = tidePlotX(sample, w0, padL, innerW);
  const x1 = tidePlotX(sample, w1, padL, innerW);
  assert.equal(tidePlotX(w0.startMs + TIDE_NOW_FRAC * w0.spanMs, w0, padL, innerW), fixed);
  assert.equal(tidePlotX(w1.startMs + TIDE_NOW_FRAC * w1.spanMs, w1, padL, innerW), fixed);
  assert.notEqual(x0, x1);
});
