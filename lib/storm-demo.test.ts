import assert from "node:assert/strict";
import test from "node:test";
import { compassFromDegrees } from "./compass.ts";
import type { ConditionsSheet } from "./conditions.ts";
import { glanceAt, parsePlanWind, prepareGlance, type GlanceSource } from "./glance-at.ts";
import { WORKING_WALL } from "./geography.ts";
import { parseLondonCivil } from "./time.ts";
import { TIDE_SOURCE } from "./tides.ts";
import { WEATHER_SOURCE } from "./weather.ts";
import { MPH_TO_MS } from "./wind-line.ts";
import {
  STORM_DEMO_LABEL,
  STORM_TIDE_STEP_MS,
  STORM_WEATHER_STEP_MS,
  applyStormDemo,
  isStormDemo,
  stormTideMetres,
  stormTideSeries,
  stormWeatherBundle,
  stormWeatherSeries,
  stormWindAt,
} from "./storm-demo.ts";

const NOW = new Date("2026-10-01T10:00:00.000Z");
const CREST = WORKING_WALL.crestMetresCD;

test("?demo=storm is the only switch", () => {
  assert.equal(isStormDemo("storm"), true);
  assert.equal(isStormDemo(" Storm "), true);
  assert.equal(isStormDemo(["storm", "other"]), true);
  assert.equal(isStormDemo(undefined), false);
  assert.equal(isStormDemo(""), false);
  assert.equal(isStormDemo("weather"), false);
});

test("the gale builds from the southwest through west to the northwest", () => {
  const start = stormWindAt(0);
  const mid = stormWindAt(12);
  const end = stormWindAt(24);
  assert.equal(compassFromDegrees(start.directionDeg).short, "SW");
  assert.equal(compassFromDegrees(mid.directionDeg).short, "W");
  assert.equal(compassFromDegrees(end.directionDeg).short, "NW");
  assert.ok(start.meanMs >= 12 && start.meanMs < 13);
  assert.ok(mid.meanMs > start.meanMs && mid.meanMs < end.meanMs);
  assert.ok(end.meanMs <= 20 && end.meanMs > 19);
  assert.ok(start.tempC <= 11 && end.tempC < start.tempC && end.tempC >= 7);

  let previous = stormWindAt(0).meanMs;
  for (let step = 1; step <= 24 * 4; step++) {
    const hours = step / 4;
    const sample = stormWindAt(hours);
    assert.ok(sample.meanMs + 1e-9 >= previous, `mean dipped at ${hours}h`);
    previous = sample.meanMs;
    assert.ok(sample.meanMs >= 12 && sample.meanMs <= 20);
    assert.ok(sample.directionDeg > 200 && sample.directionDeg < 340);
    const drift = Math.abs(sample.directionDeg - stormWindAt(hours - 0.25).directionDeg);
    const wrapped = Math.min(drift, 360 - drift);
    assert.ok(wrapped < 8, `direction jumped ${wrapped}° at ${hours}h`);
  }
});

test("every gust is at least the mean, and between 1.4 and 1.6 times it", () => {
  for (let step = -12; step <= 24 * 4; step++) {
    const sample = stormWindAt(step / 4);
    assert.ok(sample.gustMs >= sample.meanMs);
    const ratio = sample.gustMs / sample.meanMs;
    assert.ok(ratio >= 1.4 && ratio <= 1.6, `ratio ${ratio} at step ${step}`);
  }
});

test("weather samples cover the slider every quarter hour", () => {
  const series = stormWeatherSeries(NOW);
  assert.ok(series.length >= 24 * 4);
  assert.ok(series[0].t <= NOW.getTime() - 3 * 3_600_000 + 1000);
  assert.ok(series[series.length - 1].t >= NOW.getTime() + 24 * 3_600_000 - 1000);
  for (let i = 1; i < series.length; i++) {
    assert.equal(series[i].t - series[i - 1].t, STORM_WEATHER_STEP_MS);
  }
  const bundle = stormWeatherBundle(NOW);
  assert.equal(bundle.hourly.length, series.length);
  assert.equal(bundle.windCompass, "SW");
  assert.ok(bundle.windGustMph != null && bundle.windGustMph >= bundle.windMph);
  for (let i = 0; i < series.length; i++) {
    const parsed = parseLondonCivil(bundle.hourly[i].t);
    assert.ok(Math.abs(parsed - series[i].t) < 1000);
    assert.ok(bundle.hourly[i].windGustMph != null);
    assert.ok(bundle.hourly[i].windGustMph >= bundle.hourly[i].windMph);
  }
});

test("the spring high sits above the crest and the slider starts near low water", () => {
  assert.ok(CREST >= 3.4 && CREST <= 3.6);
  const atLow = stormTideMetres(0, CREST);
  const atHigh = stormTideMetres(12.4206 / 2, CREST);
  assert.ok(atLow < 1);
  assert.ok(atHigh > CREST);
  assert.ok(atHigh >= 4.8);

  const tide = stormTideSeries(NOW, CREST);
  assert.ok(tide.points[0].t <= NOW.getTime() - 12 * 3_600_000 + 1000);
  assert.ok(tide.points[tide.points.length - 1].t >= NOW.getTime() + 36 * 3_600_000);
  for (let i = 1; i < tide.points.length; i++) {
    assert.equal(tide.points[i].t - tide.points[i - 1].t, STORM_TIDE_STEP_MS);
  }
  const ahead = tide.points.filter((point) => point.t >= NOW.getTime() && point.t <= NOW.getTime() + 24 * 3_600_000);
  assert.ok(Math.min(...ahead.map((point) => point.h)) < 1);
  assert.ok(Math.max(...ahead.map((point) => point.h)) > CREST);
  const highs = tide.events.filter((event) => event.kind === "high" && event.t >= NOW.getTime());
  assert.ok(highs.length >= 2);
  assert.ok(highs.every((event) => event.h > CREST));

  const raised = stormTideSeries(NOW, 5);
  const raisedHigh = raised.events.find((event) => event.kind === "high" && event.t > NOW.getTime());
  assert.ok(raisedHigh && raisedHigh.h > 5);
});

test("scrubbing the demo runs pool, then magic waterfall, then sea", () => {
  const weather = stormWeatherSeries(NOW);
  const tide = stormTideSeries(NOW, CREST);
  const nowSample = stormWindAt(0);
  const source: GlanceSource = {
    generatedAt: NOW.toISOString(),
    sectionMode: null,
    settings: {
      wallTopMetresCD: CREST,
      overflowMetresCD: WORKING_WALL.overflowMetresCD,
      approachBandMetres: 0.35,
      waterfallWindowMinutes: 15,
      waveAllowanceMetres: 0,
    },
    settingsProblem: null,
    tideError: null,
    tide: {
      stale: false,
      points: tide.points,
      events: tide.events.map((event) => ({
        t: new Date(event.t).toISOString(),
        h: event.h,
        kind: event.kind,
      })),
    },
    weather: {
      stale: false,
      temperatureC: nowSample.tempC,
      windMph: nowSample.meanMs / MPH_TO_MS,
      windGustMph: nowSample.gustMs / MPH_TO_MS,
      windDirectionDeg: nowSample.directionDeg,
      windCompass: "SW",
      windWord: "southwest",
      waveHeightM: nowSample.waveHeightM,
      wavePeriodS: nowSample.wavePeriodS,
      hours: weather.map((point) => ({
        t: point.t,
        tempC: point.tempC,
        windMph: point.meanMs / MPH_TO_MS,
        windGustMph: point.gustMs / MPH_TO_MS,
        windDirectionDeg: point.directionDeg,
        waveHeightM: point.waveHeightM,
        wavePeriodS: point.wavePeriodS,
      })),
    },
    chopLightKt: 10,
    chopStrongKt: 18,
  };
  const prepared = prepareGlance(source);
  const start = glanceAt(prepared, 0);
  assert.equal(start.mode, "pool");
  assert.equal(start.wind?.compass, "SW");
  assert.ok(start.heightMetres != null && start.heightMetres < 1);
  assert.match(start.airFact, /air 1[01]°/);
  assert.equal(start.airFact.includes("saved"), false);

  let waterfallAt: number | null = null;
  let seaAt: number | null = null;
  for (let minutes = 0; minutes <= 24 * 60; minutes += 1) {
    const frame = glanceAt(prepared, minutes);
    if (waterfallAt == null && frame.mode === "waterfall") waterfallAt = minutes;
    if (seaAt == null && frame.mode === "sea") seaAt = minutes;
    if (waterfallAt != null && seaAt != null) break;
  }
  assert.ok(waterfallAt != null && waterfallAt > 60, `waterfall at ${waterfallAt}`);
  assert.ok(seaAt != null && waterfallAt != null && seaAt > waterfallAt, `sea at ${seaAt}`);
  const sea = glanceAt(prepared, seaAt + 30);
  assert.equal(sea.mode, "sea");
  assert.ok(sea.heightMetres != null && sea.heightMetres > CREST);

  const later = glanceAt(prepared, 24 * 60);
  assert.equal(later.wind?.compass, "NW");
  assert.ok(Number(later.wind?.avgMs) > Number(start.wind?.avgMs));
  assert.ok(Number(later.wind?.gustMs) >= Number(later.wind?.avgMs));
});

test("the demo replaces live weather and tide, and ?wind= stays a plan check", () => {
  const sheet = {
    generatedAt: NOW.toISOString(),
    settings: {
      wallTopMetresCD: CREST,
      overflowMetresCD: 3.35,
      approachBandMetres: 0.35,
      waterfallWindowMinutes: 15,
      waveAllowanceMetres: 0,
      pollutionOverride: "auto",
    },
    tideError: "Margate predictions did not load.",
    weatherError: "Open-Meteo did not answer.",
    tide: {
      fetchedAt: NOW.toISOString(),
      stale: true,
      sourceName: TIDE_SOURCE.name,
      sourceUrl: TIDE_SOURCE.url,
      points: [{ t: NOW.toISOString(), h: 1 }],
      events: [],
      dayKey: "2026-10-01",
    },
    weather: {
      time: "2026-10-01T11:00",
      temperatureC: 18,
      rainMm: 0,
      precipitationMm: 0,
      weatherCode: 0,
      summary: "Clear",
      windMph: 2,
      windGustMph: 3,
      windDirectionDeg: 90,
      windCompass: "E",
      windWord: "east",
      todayRainMm: 0,
      todayMaxRainChance: 0,
      waveHeightM: 0.2,
      wavePeriodS: 5,
      waveDirectionDeg: 90,
      hourly: [],
      waveHourly: [],
      fetchedAt: NOW.toISOString(),
      stale: true,
    },
    sources: [
      { name: TIDE_SOURCE.name, detail: "live tide", href: TIDE_SOURCE.url },
      { name: WEATHER_SOURCE.name, detail: "live weather", href: "https://open-meteo.com/" },
      { name: "Southern Water", detail: "still live", href: "https://example.com/sw" },
    ],
  } as ConditionsSheet;

  const demo = applyStormDemo(sheet);
  assert.equal(demo.tideError, null);
  assert.equal(demo.weatherError, null);
  assert.equal(demo.weather?.stale, false);
  assert.equal(demo.tide?.stale, false);
  assert.equal(demo.weather?.windCompass, "SW");
  assert.ok((demo.weather?.windMph ?? 0) > 20);
  assert.ok((demo.tide?.points.length ?? 0) > 100);
  assert.ok(demo.tide?.events.some((event) => event.kind === "high" && event.h > CREST));
  assert.match(demo.sources.find((source) => source.name === TIDE_SOURCE.name)?.detail ?? "", /synthetic spring/i);
  assert.match(demo.sources.find((source) => source.name === WEATHER_SOURCE.name)?.detail ?? "", /synthetic storm/i);
  assert.match(demo.sources.find((source) => source.name === "Southern Water")?.detail ?? "", /still live/);
  assert.equal(STORM_DEMO_LABEL, "Demo: synthetic storm — not today's forecast");
  assert.deepEqual(parsePlanWind("180,14,18"), { fromDeg: 180, avgMs: 14, gustMs: 18 });
});
