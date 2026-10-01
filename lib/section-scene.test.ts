import assert from "node:assert/strict";
import test from "node:test";
import {
  HELD_FULL,
  RATIO,
  RATIO_SUM,
  chalkSchematic,
  chopBias,
  chopMotion,
  frameLevels,
  overtopStrength,
  resolveSection,
  segmentEdges,
  swellMetres,
  waterlineU,
  type SectionInput,
} from "./section-scene.ts";

function input(partial: Partial<SectionInput> = {}): SectionInput {
  return {
    mode: null,
    seaMetresCD: 2.2,
    wallTopMetresCD: 4,
    falling: false,
    recentPeakMetresCD: 2.4,
    waveHeightM: 0.4,
    wavePeriodS: 6,
    windMph: 8,
    chopLevel: 3,
    compass: "W",
    ...partial,
  };
}

test("horizontal ratios are beach, pool, wall, sea", () => {
  assert.equal(RATIO.beach, 2.5);
  assert.equal(RATIO.pool, 5);
  assert.equal(RATIO.wall, 0.6);
  assert.equal(RATIO.sea, 3.5);
  assert.equal(RATIO_SUM, 11.6);
  const edges = segmentEdges(1160);
  assert.ok(Math.abs(edges.pool0 / 1160 - 2.5 / 11.6) < 1e-9);
  assert.ok(Math.abs(edges.wall0 / 1160 - 7.5 / 11.6) < 1e-9);
  assert.ok(Math.abs(edges.sea0 / 1160 - 8.1 / 11.6) < 1e-9);
  assert.ok(Math.abs(edges.wallW / 1160 - 0.6 / 11.6) < 1e-9);
});

test("chalk is a short beach then a flat pool floor", () => {
  assert.ok(chalkSchematic(0) > 1);
  assert.ok(chalkSchematic(0) < 1.5);
  assert.equal(chalkSchematic(RATIO.beach), 0);
  assert.equal(chalkSchematic(5), 0);
  assert.equal(chalkSchematic(7.5), 0);
  assert.equal(chalkSchematic(8.1), 0);
  assert.ok(chalkSchematic(11.6) < 0 && chalkSchematic(11.6) > -0.2);
  let prev = chalkSchematic(0);
  for (let u = 0.25; u <= RATIO.beach; u += 0.25) {
    const h = chalkSchematic(u);
    assert.ok(h <= prev + 1e-9, `chalk rose at ${u}`);
    prev = h;
  }
});

test("held-full water meets the beach slope", () => {
  assert.equal(HELD_FULL, 0.93);
  const u = waterlineU(HELD_FULL);
  assert.ok(u != null && u > 0.4 && u < RATIO.beach);
});

test("mean tide gates pool, overflow, sea, and falling", () => {
  assert.equal(resolveSection(input({ seaMetresCD: 2.2, falling: false })).mode, "pool");
  assert.equal(
    resolveSection(input({ seaMetresCD: 3.92, waveHeightM: 0.7, falling: false })).mode,
    "overflow",
  );
  assert.equal(resolveSection(input({ seaMetresCD: 4.2 })).mode, "sea");
  assert.equal(
    resolveSection(
      input({
        seaMetresCD: 3.3,
        falling: true,
        recentPeakMetresCD: 4.6,
        waveHeightM: 0.3,
      }),
    ).mode,
    "falling",
  );
  assert.equal(
    resolveSection(
      input({
        seaMetresCD: 2.2,
        falling: true,
        recentPeakMetresCD: 4.6,
      }),
    ).mode,
    "pool",
  );
  assert.equal(
    resolveSection(
      input({
        seaMetresCD: 3.92,
        falling: true,
        recentPeakMetresCD: 4.4,
        waveHeightM: 0.8,
      }),
    ).mode,
    "falling",
  );
});

test("a small wave does not open overflow from well below the crest", () => {
  assert.equal(
    resolveSection(input({ seaMetresCD: 3.2, waveHeightM: 0.1, falling: false })).mode,
    "pool",
  );
});

test("qa mode uses a canonical sea, not the live tide", () => {
  const overflow = resolveSection(input({ mode: "overflow", seaMetresCD: 1.2 }));
  assert.equal(overflow.mode, "overflow");
  assert.ok(overflow.seaDraw > 0.9);
  const pool = resolveSection(input({ mode: "pool", seaMetresCD: 4.8 }));
  assert.equal(pool.mode, "pool");
  assert.ok(pool.seaDraw < 0.6);
});

test("the sheet only pulses in overflow, and never back over the wall", () => {
  assert.equal(overtopStrength("pool", 0.99, 0.2, 0.2), 0);
  assert.equal(overtopStrength("falling", 0.99, 0.2, 0.2), 0);
  assert.equal(overtopStrength("sea", 1.2, 0.05, 0.05), 0);
  assert.equal(overtopStrength("overflow", 0.965, 0.095, -0.095), 0);
  assert.ok(overtopStrength("overflow", 0.965, 0.095, 0.095) > 0.5);
});

test("pool level stays under the crest and rises on an overflow pulse", () => {
  const pool = resolveSection(input({ mode: "pool" }));
  const falling = resolveSection(input({ mode: "falling" }));
  const overflow = resolveSection(input({ mode: "overflow" }));
  const sea = resolveSection(input({ mode: "sea" }));
  assert.equal(frameLevels(pool, 0).pool, HELD_FULL);
  assert.equal(frameLevels(falling, 1.2).pool, HELD_FULL);
  assert.equal(frameLevels(pool, 0.4).sheet, 0);
  assert.equal(frameLevels(falling, 0.4).sheet, 0);
  assert.equal(frameLevels(sea, 0.2).sheet, 0);
  assert.equal(frameLevels(sea, 0.2).pool, sea.seaDraw);

  let low = 1;
  let high = 0;
  let sawSheet = false;
  let sawGap = false;
  for (let t = 0; t < overflow.wavePeriodS; t += 0.15) {
    const frame = frameLevels(overflow, t);
    low = Math.min(low, frame.pool);
    high = Math.max(high, frame.pool);
    if (frame.sheet > 0.4) sawSheet = true;
    if (frame.sheet === 0) sawGap = true;
    assert.ok(frame.pool < 1);
    assert.ok(frame.pool >= 0.95 - 1e-9);
  }
  assert.ok(high > low);
  assert.ok(sawSheet);
  assert.ok(sawGap);
});

test("chop lines get denser, faster, and looser together", () => {
  const calm = chopMotion(1, 1);
  const rough = chopMotion(5, 1);
  assert.ok(rough.lines > calm.lines);
  assert.ok(rough.amp > calm.amp);
  assert.ok(rough.speed > calm.speed);
  assert.ok(rough.wobble > calm.wobble);
});

test("a southerly calms the pool side more than the sea", () => {
  const south = chopBias("SW");
  const north = chopBias("N");
  assert.ok(south.pool < south.sea);
  assert.ok(south.pool < north.pool);
  assert.deepEqual(chopBias("W"), { pool: 1, sea: 1 });
});

test("a measured wave wins over the wind stand-in", () => {
  assert.equal(swellMetres(0.8, 30), 0.8);
  assert.ok(swellMetres(null, 16) > 0.4);
  assert.ok(swellMetres(null, null) > 0);
});
