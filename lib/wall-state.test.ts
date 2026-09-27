import assert from "node:assert/strict";
import test from "node:test";
import { buildWallReading, classifyInstant, risingCrossings, type WallSettings } from "./wall-state.ts";

const settings: WallSettings = {
  wallTopMetresCD: 4,
  overflowMetresCD: 3.85,
  approachBandMetres: 0.35,
  waterfallWindowMinutes: 15,
  waveAllowanceMetres: 0,
};

function linearDay(start: number): { t: number; h: number }[] {
  const samples = [];
  for (let i = 0; i <= 24; i++) {
    const hours = i * 0.5;
    const rising = hours <= 6;
    const h = rising ? 0.5 + (hours / 6) * 4.5 : 5 - ((hours - 6) / 6) * 4.5;
    samples.push({ t: start + hours * 3600 * 1000, h });
  }
  return samples;
}

test("rising crossing and state windows on a linear tide", () => {
  const start = Date.parse("2026-09-27T00:00:00Z");
  const samples = linearDay(start);
  const crossings = risingCrossings(samples, 3.85);
  assert.equal(crossings.length, 1);
  const cross = crossings[0];
  const hoursToOverflow = (3.85 - 0.5) / 0.75;
  assert.ok(Math.abs(cross - (start + hoursToOverflow * 3600 * 1000)) < 1000);

  const at = (hours: number) => start + hours * 3600 * 1000;
  const heightAt = (hours: number) => 0.5 + (hours / 6) * 4.5;

  assert.equal(classifyInstant(heightAt(3), at(3), crossings, settings), "exposed");
  assert.equal(classifyInstant(heightAt(4), at(4), crossings, settings), "near_top");
  assert.equal(classifyInstant(heightAt(4 + 35 / 60), at(4 + 35 / 60), crossings, settings), "waterfall");
  assert.equal(classifyInstant(heightAt(4 + 50 / 60), at(4 + 50 / 60), crossings, settings), "covered");

  const reading = buildWallReading(samples, settings, at(4 + 35 / 60), start, start + 12 * 3600 * 1000);
  assert.ok(reading);
  assert.equal(reading.state, "waterfall");
  assert.equal(reading.label, "Magic waterfall time");
  assert.ok(reading.waterfallWindows.length >= 1);
  assert.ok(reading.changes.some((c) => c.state === "covered"));
  assert.ok(reading.changes.some((c) => c.state === "waterfall"));
});

test("falling tide does not open another waterfall", () => {
  const start = Date.parse("2026-09-27T00:00:00Z");
  const samples = linearDay(start);
  const crossings = risingCrossings(samples, settings.overflowMetresCD);
  const fallHours = 7.5;
  const height = 5 - ((fallHours - 6) / 6) * 4.5;
  assert.ok(height < 4 && height > 3.5);
  assert.equal(classifyInstant(height, start + fallHours * 3600 * 1000, crossings, settings), "near_top");
});

test("wave allowance stub lifts the tide into the next state", () => {
  const t = 0;
  const samples = [
    { t: -3600_000, h: 3.7 },
    { t: 0, h: 3.8 },
    { t: 3600_000, h: 3.9 },
  ];
  const plain = buildWallReading(samples, settings, t, -3600_000, 3600_000);
  const lifted = buildWallReading(samples, { ...settings, waveAllowanceMetres: 0.3 }, t, -3600_000, 3600_000);
  assert.equal(plain?.state, "near_top");
  assert.equal(lifted?.state, "covered");
});

test("inconsistent wall numbers withhold the reading", () => {
  const samples = [
    { t: 0, h: 1 },
    { t: 1000, h: 2 },
  ];
  const reading = buildWallReading(
    samples,
    { ...settings, overflowMetresCD: 5, wallTopMetresCD: 4 },
    500,
    0,
    1000,
  );
  assert.equal(reading, null);
});
