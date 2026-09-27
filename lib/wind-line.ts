/** Statute miles per hour to metres per second. */
export const MPH_TO_MS = 0.44704;

const THREE_HOURS = 3 * 60 * 60 * 1000;

export type WindSample = { t: number; windMph: number };

/**
 * Glance wind line. Average is the Open-Meteo hourly speeds in the last
 * three hours (one value an hour — that is the period the feed gives).
 * Gust is the current gust, converted from the same feed.
 */
export function windGlanceLine(input: {
  compass: string;
  windMph: number;
  windGustMph: number | null;
  hourly: WindSample[];
  nowIso: string;
  stale?: boolean;
}): string {
  const now = Date.parse(input.nowIso);
  const recent = input.hourly.filter((sample) => {
    if (!Number.isFinite(sample.windMph)) return false;
    return sample.t <= now && sample.t > now - THREE_HOURS;
  });
  const avgMph = recent.length
    ? recent.reduce((sum, sample) => sum + sample.windMph, 0) / recent.length
    : input.windMph;
  const avg = (avgMph * MPH_TO_MS).toFixed(1);
  const period = recent.length <= 1 ? "this hour" : `${recent.length}-hour avg`;
  const gust =
    input.windGustMph != null && Number.isFinite(input.windGustMph)
      ? ` · gust ${(input.windGustMph * MPH_TO_MS).toFixed(1)} m/s`
      : "";
  const saved = input.stale ? " · saved" : "";
  return `${input.compass} · ${avg} m/s ${period}${gust}${saved}`;
}
