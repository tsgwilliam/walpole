import { formatLondonTime, londonDayBounds, londonDayKey } from "./time";

/** Samples kept so a scrubbed minute can see the recent peak and the next two days. */
export const GLANCE_TIDE_LOOKBACK_MS = 12 * 60 * 60 * 1000;
export const GLANCE_TIDE_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

export function glanceTideDays(now: Date): Set<string> {
  const days = new Set<string>();
  days.add(londonDayKey(now));
  let cursor = londonDayBounds(now).end.getTime() + 60_000;
  for (let i = 0; i < 2; i++) {
    days.add(londonDayKey(new Date(cursor)));
    cursor = londonDayBounds(new Date(cursor)).end.getTime() + 60_000;
  }
  return days;
}

/** Tide samples and highs/lows the 24-hour slider is allowed to read. */
export function selectGlanceTide<E extends { t: string }>(
  points: { t: string; h: number }[],
  events: E[],
  now: Date,
): { points: { t: string; h: number }[]; events: E[] } {
  const from = now.getTime() - GLANCE_TIDE_LOOKBACK_MS;
  const to = now.getTime() + GLANCE_TIDE_LOOKAHEAD_MS;
  const days = glanceTideDays(now);
  return {
    points: points.filter((point) => {
      const t = Date.parse(point.t);
      return Number.isFinite(t) && t >= from && t <= to;
    }),
    events: events.filter((event) => days.has(londonDayKey(new Date(event.t)))),
  };
}

export function tideTrend(
  points: { t: string; h: number }[],
  nowIso: string,
  height: number,
): "rising" | "falling" | "steady" {
  const now = new Date(nowIso).getTime();
  const target = now - 45 * 60 * 1000;
  let best: { t: number; h: number } | null = null;
  for (const point of points) {
    const t = new Date(point.t).getTime();
    if (t > now) continue;
    if (!best || Math.abs(t - target) < Math.abs(best.t - target)) best = { t, h: point.h };
  }
  if (!best || Math.abs(best.t - target) > 80 * 60 * 1000) return "steady";
  const delta = height - best.h;
  if (delta > 0.03) return "rising";
  if (delta < -0.03) return "falling";
  return "steady";
}

/** Highest prediction in the last eight hours, for the falling-tide hold. */
export function recentTidePeak(points: { t: string; h: number }[], nowIso: string): number | null {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return null;
  const from = now - 8 * 60 * 60 * 1000;
  let peak: number | null = null;
  for (const point of points) {
    const t = Date.parse(point.t);
    if (!Number.isFinite(t) || t > now || t < from) continue;
    if (peak == null || point.h > peak) peak = point.h;
  }
  return peak;
}

/** One short line of today's highs and lows. Null when the curve has none. */
export function tideExtremesLine(events: { t: string; h: number; kind: "high" | "low" }[]): string | null {
  if (events.length === 0) return null;
  const ordered = [...events].sort((a, b) => a.t.localeCompare(b.t));
  return ordered
    .map((event) => {
      const name = event.kind === "high" ? "High" : "Low";
      return `${name} ${formatLondonTime(new Date(event.t))} · ${event.h.toFixed(1)} m`;
    })
    .join(" · ");
}
