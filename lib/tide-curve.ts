import { londonDayBounds } from "./time";

export type TideSample = { t: string; h: number };
export type TideWindow = { start: string; end: string };

/**
 * One London civil day of the tide, for the scrubbed glance time.
 * Other days are dropped so a multi-day series cannot fold onto one clock.
 * Waterfall windows are clipped to that midnight-to-midnight.
 */
export function tideCurveForDay(
  points: TideSample[],
  nowIso: string,
  windows: TideWindow[],
): { dayKey: string; points: TideSample[]; windows: TideWindow[] } {
  const bounds = londonDayBounds(new Date(nowIso));
  const startMs = bounds.start.getTime();
  const endMs = bounds.end.getTime();
  const dayPoints = points
    .filter((point) => {
      const t = Date.parse(point.t);
      return Number.isFinite(t) && t >= startMs && t < endMs;
    })
    .sort((a, b) => a.t.localeCompare(b.t));
  const dayWindows: TideWindow[] = [];
  for (const window of windows) {
    const start = Date.parse(window.start);
    const end = Date.parse(window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= startMs || start >= endMs) continue;
    dayWindows.push({
      start: new Date(Math.max(start, startMs)).toISOString(),
      end: new Date(Math.min(end, endMs)).toISOString(),
    });
  }
  return { dayKey: bounds.key, points: dayPoints, windows: dayWindows };
}

export function interpolateTide(points: TideSample[], iso: string): number | null {
  const t = Date.parse(iso);
  const samples = points
    .map((point) => ({ t: Date.parse(point.t), h: point.h }))
    .filter((point) => Number.isFinite(point.t))
    .sort((a, b) => a.t - b.t);
  if (samples.length === 0 || !Number.isFinite(t)) return null;
  if (t <= samples[0].t) return samples[0].h;
  if (t >= samples[samples.length - 1].t) return samples[samples.length - 1].h;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  if (a.t === b.t) return a.h;
  const u = (t - a.t) / (b.t - a.t);
  return a.h + (b.h - a.h) * u;
}

/** Past and forecast split on the scrubbed instant. Both halves share that point. */
export function splitTideAt(
  points: TideSample[],
  nowIso: string,
): { past: TideSample[]; future: TideSample[]; nowH: number | null } {
  const nowH = interpolateTide(points, nowIso);
  if (nowH == null) return { past: [], future: [], nowH: null };
  const nowMs = Date.parse(nowIso);
  const nowPoint = { t: nowIso, h: nowH };
  return {
    past: [...points.filter((point) => Date.parse(point.t) < nowMs), nowPoint],
    future: [nowPoint, ...points.filter((point) => Date.parse(point.t) > nowMs)],
    nowH,
  };
}

export type TideXY = { x: number; y: number };

/**
 * Smooth curve through the heights. Catmull-Rom, so the stroke passes through
 * every prediction and reads as the tide's sine rather than a 30-minute polyline.
 */
export function tideWavePath(points: TideXY[]): string {
  if (points.length === 0) return "";
  const f = (n: number) => n.toFixed(1);
  if (points.length === 1) return `M ${f(points[0].x)} ${f(points[0].y)}`;
  if (points.length === 2) {
    return `M ${f(points[0].x)} ${f(points[0].y)} L ${f(points[1].x)} ${f(points[1].y)}`;
  }
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const b1x = p1.x + (p2.x - p0.x) / 6;
    const b1y = p1.y + (p2.y - p0.y) / 6;
    const b2x = p2.x - (p3.x - p1.x) / 6;
    const b2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${f(b1x)} ${f(b1y)}, ${f(b2x)} ${f(b2y)}, ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}
