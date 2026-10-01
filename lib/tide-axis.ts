/** Scrubbed instant sits at this fixed share of the plot width. */
export const TIDE_NOW_FRAC = 0.2;

const HOUR_MS = 60 * 60 * 1000;

/** Visible strip is always twenty-four hours at a constant scale. */
export const TIDE_WINDOW_MS = 24 * HOUR_MS;

export type TideVisibleWindow = { startMs: number; endMs: number; spanMs: number };

/** Twenty-four hour window sliding with scrub time; `nowMs` maps to {@link TIDE_NOW_FRAC}. */
export function tideVisibleWindow(nowMs: number): TideVisibleWindow {
  const spanMs = TIDE_WINDOW_MS;
  const startMs = nowMs - TIDE_NOW_FRAC * spanMs;
  const endMs = nowMs + (1 - TIDE_NOW_FRAC) * spanMs;
  return { startMs, endMs, spanMs };
}

/** Fixed vertical “now” line — does not move when the curve slides. */
export function tideNowPlotX(padL: number, innerW: number): number {
  return padL + TIDE_NOW_FRAC * innerW;
}

export function tidePlotX(tMs: number, window: TideVisibleWindow, padL: number, innerW: number): number {
  return padL + ((tMs - window.startMs) / window.spanMs) * innerW;
}

export function formatTideClock(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/** Drop ticks that would overlap on the x-axis. */
export function spacedExtremeTicks<T extends { x: number }>(items: T[], minGapPx: number): T[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const kept: T[] = [];
  let lastX = -Infinity;
  for (const item of sorted) {
    if (item.x - lastX < minGapPx) continue;
    kept.push(item);
    lastX = item.x;
  }
  return kept;
}
