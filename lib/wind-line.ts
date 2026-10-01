/** Statute miles per hour to metres per second. */
export const MPH_TO_MS = 0.44704;

const THREE_HOURS = 3 * 60 * 60 * 1000;

export type WindSample = { t: number; windMph: number };

/**
 * Glance wind line. Average is the Open-Meteo hourly speeds in the last
 * three hours (one value an hour — that is the period the feed gives).
 * Gust is the current gust, converted from the same feed.
 */
export function windGlanceParts(input: {
  windMph: number;
  windGustMph: number | null;
  hourly: WindSample[];
  nowIso: string;
}): { avgMs: string; period: string; gustMs: string | null } {
  const now = Date.parse(input.nowIso);
  const recent = input.hourly.filter((sample) => {
    if (!Number.isFinite(sample.windMph)) return false;
    return sample.t <= now && sample.t > now - THREE_HOURS;
  });
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
