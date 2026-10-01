import type { ConditionsSheet } from "./conditions";
import { compassFromDegrees } from "./compass";
import { WORKING_WALL } from "./geography";
import { londonDayKey, londonParts } from "./time";
import { TIDE_SOURCE } from "./tides";
import { WEATHER_SOURCE, weatherSummary, type WeatherBundle } from "./weather";
import { MPH_TO_MS } from "./wind-line";

/** Query `?demo=storm`. Live Open-Meteo and EasyTide series are not used. */
export const STORM_DEMO_LABEL = "Demo: synthetic storm — not today's forecast";

/** Quarter-hours, so the slider moves the gale instead of jumping once an hour. */
export const STORM_WEATHER_STEP_MS = 15 * 60 * 1000;

/** Ten minutes, so the spring curve interpolates smoothly under the slider. */
export const STORM_TIDE_STEP_MS = 10 * 60 * 1000;

const WEATHER_LEAD_MS = 3 * 60 * 60 * 1000;
const WEATHER_AHEAD_MS = 24 * 60 * 60 * 1000;
const TIDE_LEAD_MS = 12 * 60 * 60 * 1000;
const TIDE_AHEAD_MS = 48 * 60 * 60 * 1000;

/** Mean spring range at Margate, metres above Chart Datum. */
const TIDE_LOW_M = 0.45;
const TIDE_HIGH_M = 4.85;
const TIDE_PERIOD_H = 12.4206;

export type StormWeatherPoint = {
  t: number;
  meanMs: number;
  gustMs: number;
  directionDeg: number;
  tempC: number;
  rainMm: number;
  waveHeightM: number;
  wavePeriodS: number;
};

export type StormTidePoint = { t: number; h: number };
export type StormTideEvent = StormTidePoint & { kind: "high" | "low" };

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function londonCivil(instant: Date): string {
  const parts = londonParts(instant);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function msToMph(metresPerSecond: number): number {
  return metresPerSecond / MPH_TO_MS;
}

export function isStormDemo(value: string | string[] | undefined): boolean {
  const text = Array.isArray(value) ? value[0] : value;
  return (text ?? "").trim().toLowerCase() === "storm";
}

/**
 * One moment of the gale. From the sheet time the mean climbs from 12 m/s
 * to 20 m/s and the direction veers southwest → west → northwest, with a
 * few degrees of drift. Gusts stay between 1.4× and 1.6× the mean.
 * Hours before the sheet time are the three-hour lead-in for the average.
 */
export function stormWindAt(hoursFromNow: number): Omit<StormWeatherPoint, "t"> {
  const meanMs = 12 + 8 * smoothstep(hoursFromNow / 18);
  const gustFactor = 1.5 + 0.08 * Math.sin(hoursFromNow * 0.85);
  const directionDeg =
    (225 + 90 * smoothstep(hoursFromNow / 24) + 7 * Math.sin(hoursFromNow * 0.55) + 360) % 360;
  const tempC = 11 - 3 * smoothstep(hoursFromNow / 24);
  const rainMm = 0.4 + 1.8 * smoothstep(hoursFromNow / 16);
  return {
    meanMs,
    gustMs: meanMs * gustFactor,
    directionDeg,
    tempC,
    rainMm,
    waveHeightM: 0.35 + meanMs * 0.09,
    wavePeriodS: 6.5 + smoothstep(hoursFromNow / 24),
  };
}

/** Spring height. Low water is at the sheet time; the first high is half a tide later. */
export function stormTideMetres(hoursFromNow: number, wallTopMetresCD: number = WORKING_WALL.crestMetresCD): number {
  const high = Math.max(TIDE_HIGH_M, wallTopMetresCD + 1.1);
  const low = Math.min(TIDE_LOW_M, Math.max(0.3, wallTopMetresCD - 3));
  const mean = (high + low) / 2;
  const amp = (high - low) / 2;
  const theta = (2 * Math.PI * (hoursFromNow - TIDE_PERIOD_H / 2)) / TIDE_PERIOD_H;
  return mean + amp * Math.cos(theta);
}

export function stormWeatherSeries(now: Date): StormWeatherPoint[] {
  const start = now.getTime() - WEATHER_LEAD_MS;
  const end = now.getTime() + WEATHER_AHEAD_MS;
  const points: StormWeatherPoint[] = [];
  for (let t = start; t <= end; t += STORM_WEATHER_STEP_MS) {
    const hours = (t - now.getTime()) / 3_600_000;
    points.push({ t, ...stormWindAt(hours) });
  }
  return points;
}

export function stormTideSeries(
  now: Date,
  wallTopMetresCD: number = WORKING_WALL.crestMetresCD,
): { points: StormTidePoint[]; events: StormTideEvent[] } {
  const start = now.getTime() - TIDE_LEAD_MS;
  const end = now.getTime() + TIDE_AHEAD_MS;
  const points: StormTidePoint[] = [];
  for (let t = start; t <= end; t += STORM_TIDE_STEP_MS) {
    const hours = (t - now.getTime()) / 3_600_000;
    points.push({ t, h: stormTideMetres(hours, wallTopMetresCD) });
  }
  const events: StormTideEvent[] = [];
  const fromH = -TIDE_LEAD_MS / 3_600_000;
  const toH = TIDE_AHEAD_MS / 3_600_000;
  for (let n = -2; n <= 6; n++) {
    const lowH = n * TIDE_PERIOD_H;
    const highH = TIDE_PERIOD_H / 2 + n * TIDE_PERIOD_H;
    if (lowH >= fromH && lowH <= toH) {
      events.push({
        t: now.getTime() + lowH * 3_600_000,
        h: stormTideMetres(lowH, wallTopMetresCD),
        kind: "low",
      });
    }
    if (highH >= fromH && highH <= toH) {
      events.push({
        t: now.getTime() + highH * 3_600_000,
        h: stormTideMetres(highH, wallTopMetresCD),
        kind: "high",
      });
    }
  }
  events.sort((a, b) => a.t - b.t);
  return { points, events };
}

export function stormWeatherBundle(now: Date): WeatherBundle {
  const series = stormWeatherSeries(now);
  const current = stormWindAt(0);
  const rose = compassFromDegrees(current.directionDeg);
  const today = londonDayKey(now);
  const hourly = series.map((point) => ({
    t: londonCivil(new Date(point.t)),
    tempC: point.tempC,
    rainMm: point.rainMm,
    pop: 90,
    windMph: msToMph(point.meanMs),
    windGustMph: msToMph(point.gustMs),
    windDirectionDeg: point.directionDeg,
  }));
  const todayHours = hourly.filter((hour) => hour.t.startsWith(today));
  const todayRainMm = todayHours.reduce((sum, hour) => sum + hour.rainMm, 0);
  return {
    time: londonCivil(now),
    temperatureC: current.tempC,
    rainMm: current.rainMm,
    precipitationMm: current.rainMm,
    weatherCode: 63,
    summary: weatherSummary(63),
    windMph: msToMph(current.meanMs),
    windGustMph: msToMph(current.gustMs),
    windDirectionDeg: current.directionDeg,
    windCompass: rose.short,
    windWord: rose.word,
    todayRainMm,
    todayMaxRainChance: 90,
    waveHeightM: current.waveHeightM,
    wavePeriodS: current.wavePeriodS,
    waveDirectionDeg: current.directionDeg,
    hourly,
    waveHourly: series.map((point) => ({
      t: londonCivil(new Date(point.t)),
      waveHeightM: point.waveHeightM,
      wavePeriodS: point.wavePeriodS,
    })),
  };
}

/** Replace the glance weather and tide. Bathing water and sewage stay as loaded. */
export function applyStormDemo(sheet: ConditionsSheet): ConditionsSheet {
  const now = new Date(sheet.generatedAt);
  const weather = stormWeatherBundle(now);
  const tide = stormTideSeries(now, sheet.settings.wallTopMetresCD);
  return {
    ...sheet,
    tideError: null,
    weatherError: null,
    tide: {
      fetchedAt: sheet.generatedAt,
      stale: false,
      sourceName: "Synthetic spring tide",
      sourceUrl: TIDE_SOURCE.url,
      points: tide.points.map((point) => ({ t: new Date(point.t).toISOString(), h: point.h })),
      events: tide.events.map((event) => ({
        t: new Date(event.t).toISOString(),
        h: event.h,
        kind: event.kind,
      })),
      dayKey: londonDayKey(now),
    },
    weather: { ...weather, fetchedAt: sheet.generatedAt, stale: false },
    sources: sheet.sources.map((source) => {
      if (source.name === TIDE_SOURCE.name) {
        return {
          ...source,
          detail: "Not used on this sheet. The heights are a synthetic spring tide.",
        };
      }
      if (source.name === WEATHER_SOURCE.name) {
        return {
          ...source,
          detail: "Not used on this sheet. The wind and air are a synthetic storm.",
        };
      }
      return source;
    }),
  };
}
