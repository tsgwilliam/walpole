import assert from "node:assert/strict";
import test from "node:test";
import { TIDE_NOW_FRAC, tidePlotX, tideVisibleWindow } from "./tide-axis.ts";

test("the scrubbed instant sits at twenty per cent on a linear time window", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");
  const window = tideVisibleWindow(now, [now - 3_600_000, now + 20 * 3_600_000], []);
  const xNow = tidePlotX(now, window, 10, 200);
  assert.equal(xNow, 10 + 200 * TIDE_NOW_FRAC);
  assert.ok(window.endMs > now + 18 * 3_600_000);
  assert.ok(window.startMs < now);
  const early = tidePlotX(now - 0.1 * window.spanMs, window, 10, 200);
  const late = tidePlotX(now + 0.1 * window.spanMs, window, 10, 200);
  assert.ok(late - early > 0);
  assert.ok(Math.abs(late - early - 0.2 * 200) < 2);
});

test("the window grows when samples or extrema sit further out", () => {
  const now = Date.parse("2026-10-01T12:00:00.000Z");
  const short = tideVisibleWindow(now, [now, now + 8 * 3_600_000], []);
  const long = tideVisibleWindow(now, [now, now + 30 * 3_600_000], [now + 28 * 3_600_000]);
  assert.ok(long.spanMs >= short.spanMs);
});
