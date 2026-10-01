import { classifyChop, cliffTemperLine } from "./chop";
import { compassFromDegrees } from "./compass";
import {
  glanceMode,
  MODE_HEADLINE,
  modeEndAt,
  modeRemainingLine,
  modeUnbrokenLine,
  type GlanceMode,
} from "./modes";
import type { PictureMode, SectionInput } from "./section-scene";
import { recentTidePeak, tideExtremesLine, tideTrend } from "./tide-glance";
import { londonDayKey, parseLondonCivil, scrubTimeLabel } from "./time";
import {
  listStateChanges,
  readingAt,
  settingsAreUsable,
  tideCrossings,
  type WallSettings,
  type WallStateId,
} from "./wall-state";
import { windGlanceLine, windGlanceParts, windPeriodPhrase } from "./wind-line";

/** Slider length: this minute through the next day. */
export const HORIZON_MINUTES = 24 * 60;

const LIVE_MS = 15 * 60 * 1000;
const CHANGE_LEAD_MS = 12 * 60 * 60 * 1000;
const CHANGE_FOLLOW_MS = 48 * 60 * 60 * 1000;
const HOUR_SLACK_MS = 90 * 60 * 1000;

export type GlanceHour = {
  t: number;
  tempC: number;
  windMph: number;
  windGustMph: number | null;
  windDirectionDeg: number | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
};

export type GlanceSource = {
  generatedAt: string;
  sectionMode: PictureMode | null;
  settings: WallSettings;
  settingsProblem: string | null;
  tideError: string | null;
  tide: null | {
    stale: boolean;
    points: { t: number; h: number }[];
    events: { t: string; h: number; kind: "high" | "low" }[];
  };
  weather: null | {
    stale: boolean;
    temperatureC: number;
    windMph: number;
    windGustMph: number | null;
    windDirectionDeg: number;
    windCompass: string;
    windWord: string;
    waveHeightM: number | null;
    wavePeriodS: number | null;
    hours: GlanceHour[];
  };
  chopLightKt: number;
  chopStrongKt: number;
};

export type PreparedGlance = {
  source: GlanceSource;
  generatedAt: number;
  ordered: { t: number; h: number }[];
  crossings: number[];
  changes: { at: string; state: WallStateId }[];
  curveEnd: number | null;
  pointsIso: { t: string; h: number }[];
};

export type WindFrame = {
  compass: string;
  word: string;
  directionDeg: number;
  hasDirection: boolean;
  avgMs: string;
  periodPhrase: string;
  gustMs: string | null;
  stale: boolean;
  summary: string;
  cliff: string;
};

export type GlanceFrame = {
  at: string;
  timeLabel: string;
  minutesAhead: number;
  mode: GlanceMode | null;
  headline: string;
  remaining: string | null;
  tideFact: string;
  airFact: string;
  heightMetres: number | null;
  trend: "rising" | "falling" | "steady" | null;
  wind: WindFrame | null;
  extrema: string | null;
  section: SectionInput | null;
  sr: string;
};

export function parseAtOffsetMinutes(value: string | undefined, now: Date): number {
  if (!value) return 0;
  const text = value.trim();
  const hours = /^(\d+(?:\.\d+)?)h$/i.exec(text);
  if (hours) return clampMinutes(Math.round(Number(hours[1]) * 60));
  const mins = /^(\d+)m$/i.exec(text);
  if (mins) return clampMinutes(Number(mins[1]));
  const ms = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) ? Date.parse(text) : parseLondonCivil(text);
  if (!Number.isFinite(ms)) return 0;
  return clampMinutes(Math.round((ms - now.getTime()) / 60_000));
}

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.min(HORIZON_MINUTES, Math.round(minutes));
}

export function prepareGlance(source: GlanceSource): PreparedGlance {
  const generatedAt = Date.parse(source.generatedAt);
  const projected = source.tide ? tideCrossings(source.tide.points, source.settings) : null;
  const ordered = projected?.ordered ?? [];
  const crossings = projected?.crossings ?? [];
  const changes =
    projected == null
      ? []
      : listStateChanges(
          ordered,
          crossings,
          source.settings,
          generatedAt - CHANGE_LEAD_MS,
          generatedAt + CHANGE_FOLLOW_MS,
        ).map((change) => ({ at: new Date(change.t).toISOString(), state: change.state }));
  return {
    source,
    generatedAt,
    ordered,
    crossings,
    changes,
    curveEnd: ordered.length ? ordered[ordered.length - 1].t : null,
    pointsIso: ordered.map((point) => ({ t: new Date(point.t).toISOString(), h: point.h })),
  };
}

function hourAt(hours: GlanceHour[], at: number): GlanceHour | null {
  let best: GlanceHour | null = null;
  let first: GlanceHour | null = null;
  for (const hour of hours) {
    if (!first || hour.t < first.t) first = hour;
    if (hour.t <= at && (!best || hour.t > best.t)) best = hour;
  }
  if (best && at - best.t <= HOUR_SLACK_MS) return best;
  if (first && first.t >= at && first.t - at <= HOUR_SLACK_MS) return first;
  return null;
}

function windFrame(source: GlanceSource, atMs: number, generatedAt: number): WindFrame | null {
  const weather = source.weather;
  if (!weather) return null;
  const live = Math.abs(atMs - generatedAt) < LIVE_MS;
  const hour = hourAt(weather.hours, atMs);
  if (!live && !hour) return null;

  let compass = weather.windCompass;
  let word = weather.windWord;
  let directionDeg = weather.windDirectionDeg;
  let hasDirection = Number.isFinite(directionDeg);
  let windMph = weather.windMph;
  let gust = weather.windGustMph;
  if (!live && hour) {
    windMph = Number.isFinite(hour.windMph) ? hour.windMph : weather.windMph;
    gust = hour.windGustMph;
    if (hour.windDirectionDeg != null) {
      const rose = compassFromDegrees(hour.windDirectionDeg);
      compass = rose.short;
      word = rose.word;
      directionDeg = hour.windDirectionDeg;
      hasDirection = true;
    } else {
      compass = "";
      word = "";
      hasDirection = false;
    }
  }

  const nowIso = new Date(atMs).toISOString();
  const hourly = weather.hours
    .filter((sample) => Number.isFinite(sample.windMph))
    .map((sample) => ({ t: sample.t, windMph: sample.windMph }));
  const parts = windGlanceParts({ windMph, windGustMph: gust, hourly, nowIso });
  return {
    compass,
    word,
    directionDeg,
    hasDirection,
    avgMs: parts.avgMs,
    periodPhrase: windPeriodPhrase(parts.period),
    gustMs: parts.gustMs,
    stale: weather.stale,
    summary: windGlanceLine({
      compass: compass || "wind",
      windMph,
      windGustMph: gust,
      hourly,
      nowIso,
      stale: weather.stale,
    }),
    cliff: cliffTemperLine(hasDirection ? compass : ""),
  };
}

function airFact(source: GlanceSource, atMs: number, generatedAt: number): string {
  const weather = source.weather;
  if (!weather) return "air quiet";
  const live = Math.abs(atMs - generatedAt) < LIVE_MS;
  let temp = weather.temperatureC;
  if (!live) {
    const hour = hourAt(weather.hours, atMs);
    if (!hour || !Number.isFinite(hour.tempC)) return "air quiet";
    temp = hour.tempC;
  }
  return `air ${Math.round(temp)}°${weather.stale ? " · saved" : ""}`;
}

function marineAt(source: GlanceSource, atMs: number, generatedAt: number) {
  const weather = source.weather;
  if (!weather) {
    return { waveHeightM: null as number | null, wavePeriodS: null as number | null, windMph: null as number | null, compass: null as string | null };
  }
  const live = Math.abs(atMs - generatedAt) < LIVE_MS;
  if (live) {
    return {
      waveHeightM: weather.waveHeightM,
      wavePeriodS: weather.wavePeriodS,
      windMph: weather.windMph,
      compass: weather.windCompass,
    };
  }
  const hour = hourAt(weather.hours, atMs);
  if (!hour) {
    return { waveHeightM: null, wavePeriodS: null, windMph: null, compass: null };
  }
  return {
    waveHeightM: hour.waveHeightM,
    wavePeriodS: hour.wavePeriodS,
    windMph: Number.isFinite(hour.windMph) ? hour.windMph : null,
    compass: hour.windDirectionDeg != null ? compassFromDegrees(hour.windDirectionDeg).short : null,
  };
}

function extremaAt(events: { t: string; h: number; kind: "high" | "low" }[], atIso: string): string | null {
  const key = londonDayKey(new Date(atIso));
  return tideExtremesLine(events.filter((event) => londonDayKey(new Date(event.t)) === key));
}

export function glanceAt(prepared: PreparedGlance, minutesAhead: number): GlanceFrame {
  const minutes = clampMinutes(minutesAhead);
  const atMs = prepared.generatedAt + minutes * 60_000;
  const atIso = new Date(atMs).toISOString();
  const { source } = prepared;
  const usable = source.tide != null && settingsAreUsable(source.settings) == null;
  const reading = usable ? readingAt(prepared.ordered, prepared.crossings, source.settings, atMs) : null;

  let mode: GlanceMode | null = null;
  let headline = "No reading";
  let remaining: string | null = null;
  let tideFact = "tide quiet";
  let trend: GlanceFrame["trend"] = null;
  let heightMetres: number | null = null;

  if (reading) {
    heightMetres = reading.heightMetres;
    mode = glanceMode(reading.state);
    headline = MODE_HEADLINE[mode];
    trend = tideTrend(prepared.pointsIso, atIso, reading.heightMetres);
    const saved = source.tide?.stale ? " · saved" : "";
    tideFact = `tide ${reading.heightMetres.toFixed(1)} m CD · ${trend}${saved}`;
    const end = modeEndAt(reading.state, prepared.changes, atIso);
    if (end) remaining = modeRemainingLine(mode, end, atIso);
    else {
      const horizon = atMs + 24 * 60 * 60 * 1000;
      const covered = prepared.curveEnd != null && prepared.curveEnd >= horizon - 60_000;
      remaining = modeUnbrokenLine(mode, covered ? "day" : "curve");
    }
  }

  const marine = marineAt(source, atMs, prepared.generatedAt);
  const chop =
    marine.windMph != null
      ? classifyChop({
          windMph: marine.windMph,
          compass: marine.compass ?? "",
          lightKt: source.chopLightKt,
          strongKt: source.chopStrongKt,
        })
      : null;
  const wind = windFrame(source, atMs, prepared.generatedAt);
  const extrema = source.tide ? extremaAt(source.tide.events, atIso) : null;
  const section =
    source.sectionMode || reading
      ? {
          mode: source.sectionMode,
          seaMetresCD: reading?.heightMetres ?? null,
          wallTopMetresCD: source.settings.wallTopMetresCD,
          falling: trend === "falling",
          recentPeakMetresCD: source.tide ? recentTidePeak(prepared.pointsIso, atIso) : null,
          waveHeightM: marine.waveHeightM,
          wavePeriodS: marine.wavePeriodS,
          windMph: marine.windMph,
          chopLevel: chop?.level ?? 2,
          compass: marine.compass,
        }
      : null;

  const srParts = [
    mode
      ? `${headline}. ${remaining}. Predicted ${heightMetres!.toFixed(1)} metres Chart Datum${trend ? `, ${trend}` : ""}.`
      : source.settingsProblem || source.tideError || "Wall reading withheld.",
    wind ? `Wind: ${wind.summary}. ${wind.cliff}` : "",
    extrema ? `${extrema}.` : "",
  ].filter(Boolean);

  return {
    at: atIso,
    timeLabel: scrubTimeLabel(atMs, prepared.generatedAt),
    minutesAhead: minutes,
    mode,
    headline,
    remaining,
    tideFact,
    airFact: airFact(source, atMs, prepared.generatedAt),
    heightMetres,
    trend,
    wind,
    extrema,
    section,
    sr: srParts.join(" "),
  };
}
