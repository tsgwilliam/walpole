/** Statute miles per hour to metres per second. */
export const MPH_TO_MS = 0.44704;

const THREE_HOURS = 3 * 60 * 60 * 1000;

export type WindSample = { t: number; windMph: number };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Glance wind line. Average is the speeds in the last three hours, one
 * value an hour. A denser series (the storm demo samples every quarter
 * hour) still counts as hours: the latest sample in each clock hour, and
 * at most three of those. Gust is the reading at the scrubbed minute.
 */
export function windGlanceParts(input: {
  windMph: number;
  windGustMph: number | null;
  hourly: WindSample[];
  nowIso: string;
}): { avgMs: string; period: string; gustMs: string | null } {
  const now = Date.parse(input.nowIso);
  const byHour = new Map<number, WindSample>();
  for (const sample of input.hourly) {
    if (!Number.isFinite(sample.windMph)) continue;
    if (!(sample.t <= now && sample.t > now - THREE_HOURS)) continue;
    const key = Math.floor(sample.t / HOUR_MS);
    const prev = byHour.get(key);
    if (!prev || sample.t >= prev.t) byHour.set(key, sample);
  }
  const recent = [...byHour.values()].sort((a, b) => a.t - b.t).slice(-3);
  const avgMph = recent.length
    ? recent.reduce((sum, sample) => sum + sample.windMph, 0) / recent.length
    : input.windMph;
  const gustMs =
    input.windGustMph != null && Number.isFinite(input.windGustMph)
      ? (input.windGustMph * MPH_TO_MS).toFixed(1)
      : null;
  return {
    avgMs: (avgMph * MPH_TO_MS).toFixed(1),
    period: recent.length <= 1 ? "this hour" : `${recent.length}-hour avg`,
    gustMs,
  };
}

/** Spoken form of the period token from `windGlanceParts`. */
export function windPeriodPhrase(period: string): string {
  if (period === "this hour") return "this hour";
  const match = /^(\d+)-hour avg$/.exec(period);
  if (!match) return period;
  const n = Number(match[1]);
  return `${n}-hour average`;
}

export function windGlanceLine(input: {
  compass: string;
  windMph: number;
  windGustMph: number | null;
  hourly: WindSample[];
  nowIso: string;
  stale?: boolean;
}): string {
  const parts = windGlanceParts(input);
  const gust = parts.gustMs ? ` · gust ${parts.gustMs} m/s` : "";
  const saved = input.stale ? " · saved" : "";
  return `${input.compass} · ${parts.avgMs} m/s ${parts.period}${gust}${saved}`;
}
