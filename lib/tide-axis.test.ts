import assert from "node:assert/strict";
import test from "node:test";
import { TIDE_NOW_FRAC, tideDayFraction, tidePlotX } from "./tide-axis.ts";

test("the scrubbed instant sits at twenty per cent of the day plot", () => {
  assert.equal(tideDayFraction(0, 600), 0);
  assert.equal(tideDayFraction(600, 600), TIDE_NOW_FRAC);
  assert.equal(tideDayFraction(1440, 600), 1);
  assert.ok(tideDayFraction(300, 600) < TIDE_NOW_FRAC);
  assert.ok(tideDayFraction(900, 600) > TIDE_NOW_FRAC);
  const now = "2026-10-01T10:00:00.000Z";
  const x = tidePlotX(now, now, 10, 200);
  assert.equal(x, 10 + 200 * TIDE_NOW_FRAC);
});
