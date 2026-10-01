import assert from "node:assert/strict";
import test from "node:test";
import { downwindDegrees } from "./compass.ts";
import { glanceAt, parseAtOffsetMinutes, prepareGlance, type GlanceSource } from "./glance-at.ts";
import { resolveSection } from "./section-scene.ts";
import type { WallSettings } from "./wall-state.ts";

const settings: WallSettings = {
  wallTopMetresCD: 4,
  overflowMetresCD: 3.85,
  approachBandMetres: 0.4,
  waterfallWindowMinutes: 15,
  waveAllowanceMetres: 0,
};

const T0 = Date.parse("2026-10-01T10:00:00.000Z");

function tideHeight(hours: number): number {
  if (hours <= 10) return 2 + (2.6 * hours) / 10;
  if (hours <= 20) return 4.6 - (3.1 * (hours - 10)) / 10;
  return 1.5;
}

function source(partial: Partial<GlanceSource> = {}): GlanceSource {
  const points = [];
  for (let step = -4; step <= 80; step++) {
    const hours = step * 0.5;
    points.push({ t: T0 + hours * 3_600_000, h: tideHeight(hours) });
  }
  const hours = [-2, -1, 0, 1, 2, 3, 6].map((hour) => ({
    t: T0 + hour * 3_600_000,
    tempC: hour === 3 ? 11 : 14,
    windMph: hour === 3 ? 22 : hour === 6 ? 8 : 10,
    windGustMph: hour === 3 ? 30 : 18,
    windDirectionDeg: hour === 3 ? 0 : hour === 6 ? 270 : 202.5,
    waveHeightM: hour === 3 ? 1.1 : 0.4,
    wavePeriodS: 6,
  }));
  return {
    generatedAt: new Date(T0).toISOString(),
    sectionMode: null,
    settings,
    settingsProblem: null,
    tideError: null,
    tide: {
      stale: false,
      points,
      events: [
        { t: "2026-10-01T02:00:00.000Z", h: 0.8, kind: "low" },
        { t: "2026-10-01T20:00:00.000Z", h: 4.6, kind: "high" },
        { t: "2026-10-02T06:00:00.000Z", h: 1.2, kind: "low" },
      ],
    },
    weather: {
      stale: false,
      temperatureC: 14,
      windMph: 12,
      windGustMph: 20,
      windDirectionDeg: 202.5,
      windCompass: "SSW",
      windWord: "south-southwest",
      waveHeightM: 0.4,
      wavePeriodS: 6.5,
      hours,
    },
    chopLightKt: 10,
    chopStrongKt: 18,
    ...partial,
  };
}

function frameAt(minutes: number, partial: Partial<GlanceSource> = {}) {
  return glanceAt(prepareGlance(source(partial)), minutes);
}

test("the arrow points the way the wind is travelling", () => {
  assert.equal(downwindDegrees(0), 180);
  assert.equal(downwindDegrees(180), 0);
  assert.equal(downwindDegrees(90), 270);
  assert.equal(downwindDegrees(270), 90);
});

test("now is pool, with today's extremes and the live southerly", () => {
  const frame = frameAt(0);
  assert.equal(frame.timeLabel, "Now · 11:00");
  assert.equal(frame.mode, "pool");
  assert.equal(frame.headline, "Pool mode activated");
  assert.match(frame.remaining ?? "", /Pool mode active for another 7 hours/);
  assert.match(frame.tideFact, /^tide 2\.0 m CD · rising/);
  assert.equal(frame.airFact, "air 14°");
  assert.equal(frame.wind?.compass, "SSW");
  assert.equal(frame.wind?.word, "south-southwest");
  assert.equal(frame.wind?.gustMs, (20 * 0.44704).toFixed(1));
  assert.match(frame.wind?.cliff ?? "", /southerly/i);
  assert.match(frame.wind?.cliff ?? "", /direction guess/);
  assert.equal(frame.extrema, "Low 03:00 · 0.8 m · High 21:00 · 4.6 m");
  assert.equal(frame.section?.seaMetresCD, 2);
  assert.equal(resolveSection(frame.section!).mode, "pool");
});

test("scrubbing moves tide, mode, wind, and the ink inputs", () => {
  const waterfall = frameAt(7.2 * 60);
  assert.equal(waterfall.mode, "waterfall");
  assert.equal(waterfall.headline, "Magic waterfall activated");
  assert.ok((waterfall.heightMetres ?? 0) > 3.85 && (waterfall.heightMetres ?? 0) < 4);
  assert.equal(resolveSection(waterfall.section!).mode, "overflow");

  const sea = frameAt(9 * 60);
  assert.equal(sea.timeLabel, "Today · 20:00");
  assert.equal(sea.mode, "sea");
  assert.match(sea.tideFact, /^tide 4\.3 m CD/);
  assert.equal(resolveSection(sea.section!).mode, "sea");
  assert.ok((sea.section?.seaMetresCD ?? 0) > (frameAt(0).section?.seaMetresCD ?? 0));

  const later = frameAt(3 * 60);
  assert.equal(later.wind?.compass, "N");
  assert.equal(later.wind?.directionDeg, 0);
  assert.equal(later.airFact, "air 11°");
  assert.equal(later.wind?.gustMs, (30 * 0.44704).toFixed(1));
  assert.match(later.wind?.cliff ?? "", /little help/);
  assert.equal(later.section?.waveHeightM, 1.1);

  const cross = frameAt(6 * 60);
  assert.equal(cross.wind?.compass, "W");
  assert.match(cross.wind?.cliff ?? "", /unknown/);

  const falling = frameAt(12 * 60);
  assert.equal(falling.mode, "pool");
  assert.equal(falling.trend, "falling");
  assert.equal(resolveSection(falling.section!).mode, "falling");

  const tomorrow = frameAt(20 * 60);
  assert.equal(tomorrow.timeLabel, "Tomorrow · 07:00");
  assert.equal(tomorrow.extrema, "Low 07:00 · 1.2 m");
  assert.equal(frameAt(4000).minutesAhead, 24 * 60);
});

test("a mode change after midnight still has a duration", () => {
  const now = Date.parse("2026-10-01T21:00:00.000Z");
  const points = [];
  for (let hour = -2; hour <= 30; hour += 0.25) {
    const t = now + hour * 3_600_000;
    const covered = t >= Date.parse("2026-10-02T01:00:00.000Z");
    points.push({ t, h: covered ? 4.4 : 2.2 });
  }
  const frame = glanceAt(
    prepareGlance(
      source({
        generatedAt: new Date(now).toISOString(),
        tide: { stale: false, points, events: [] },
        weather: null,
      }),
    ),
    0,
  );
  assert.equal(frame.timeLabel, "Now · 22:00");
  assert.equal(frame.mode, "pool");
  assert.match(frame.remaining ?? "", /another 3 hours/);
  assert.doesNotMatch(frame.remaining ?? "", /rest of today/);
  const overnight = glanceAt(
    prepareGlance(
      source({
        generatedAt: new Date(now).toISOString(),
        tide: { stale: false, points, events: [] },
        weather: null,
      }),
    ),
    5 * 60,
  );
  assert.equal(overnight.mode, "sea");
  assert.equal(overnight.timeLabel, "Tomorrow · 03:00");
  assert.equal(frame.airFact, "air quiet");
  assert.equal(frame.wind, null);
});

test("?at= accepts hours, minutes, and London civil time", () => {
  const now = new Date("2026-10-01T10:00:00.000Z");
  assert.equal(parseAtOffsetMinutes(undefined, now), 0);
  assert.equal(parseAtOffsetMinutes("6h", now), 360);
  assert.equal(parseAtOffsetMinutes("6.5h", now), 390);
  assert.equal(parseAtOffsetMinutes("90m", now), 90);
  assert.equal(parseAtOffsetMinutes("30h", now), 24 * 60);
  assert.equal(parseAtOffsetMinutes("-2h", now), 0);
  assert.equal(parseAtOffsetMinutes("2026-10-01T18:00", now), 7 * 60);
  assert.equal(parseAtOffsetMinutes("2026-10-01T17:00:00.000Z", now), 7 * 60);
});

test("?mode= pins the picture and the tide height still follows the clock", () => {
  const frame = frameAt(9 * 60, { sectionMode: "pool" });
  assert.equal(frame.mode, "sea");
  assert.equal(frame.section?.mode, "pool");
  assert.equal(resolveSection(frame.section!).mode, "pool");
  assert.ok((frame.section?.seaMetresCD ?? 0) > 4);
});
