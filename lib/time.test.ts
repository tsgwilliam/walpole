import assert from "node:assert/strict";
import test from "node:test";
import { formatLondonTime, londonDayBounds, londonDayKey, parseLondonCivil } from "./time.ts";

test("September 2026 is British Summer Time", () => {
  const noon = new Date("2026-09-27T12:00:00Z");
  assert.equal(londonDayKey(noon), "2026-09-27");
  assert.equal(formatLondonTime(noon), "13:00");
  const bounds = londonDayBounds(noon);
  assert.equal(bounds.start.toISOString(), "2026-09-26T23:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-09-27T23:00:00.000Z");
});

test("Open-Meteo London stamps parse as civil time", () => {
  assert.equal(new Date(parseLondonCivil("2026-09-27T16:00")).toISOString(), "2026-09-27T15:00:00.000Z");
  assert.equal(new Date(parseLondonCivil("2026-01-15T16:00")).toISOString(), "2026-01-15T16:00:00.000Z");
});

test("January 2026 is GMT", () => {
  const noon = new Date("2026-01-15T12:00:00Z");
  assert.equal(formatLondonTime(noon), "12:00");
  const bounds = londonDayBounds(noon);
  assert.equal(bounds.key, "2026-01-15");
  assert.equal(bounds.start.toISOString(), "2026-01-15T00:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-01-16T00:00:00.000Z");
});
