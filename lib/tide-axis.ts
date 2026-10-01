/** Scrubbed instant sits at this share of the visible plot width. */
export const TIDE_NOW_FRAC = 0.2;

const HOUR_MS = 60 * 60 * 1000;

export type TideVisibleWindow = { startMs: number; endMs: number; spanMs: number };

/**
 * Linear time window: honest scale, no horizontal squash. `nowMs` sits at
 * {@link TIDE_NOW_FRAC} from the left; enough past and future for the curve.
 */
export function tideVisibleWindow(
  nowMs: number,
  sampleMs: number[],
  eventMs: number[],
): TideVisibleWindow {
  const minFuture = 22 * HOUR_MS;
  const minPast = 6 * HOUR_MS;
  let span = Math.max(minFuture / (1 - TIDE_NOW_FRAC), minPast / TIDE_NOW_FRAC);

  const futureNeed = Math.max(minFuture, ...eventMs.filter((t) => t >= nowMs).map((t) => t - nowMs), 0);
  const pastNeed = Math.max(minPast, ...sampleMs.filter((t) => t <= nowMs).map((t) => nowMs - t), 0);
  span = Math.max(span, futureNeed / (1 - TIDE_NOW_FRAC), pastNeed / TIDE_NOW_FRAC);

  const dataMax = sampleMs.length ? Math.max(...sampleMs) : nowMs + minFuture;
  const dataMin = sampleMs.length ? Math.min(...sampleMs) : nowMs - minPast;
  if (dataMax > nowMs) span = Math.max(span, (dataMax - nowMs) / (1 - TIDE_NOW_FRAC));
  if (dataMin < nowMs) span = Math.max(span, (nowMs - dataMin) / TIDE_NOW_FRAC);

  const startMs = nowMs - TIDE_NOW_FRAC * span;
  const endMs = nowMs + (1 - TIDE_NOW_FRAC) * span;
  return { startMs, endMs, spanMs: endMs - startMs };
}

export function tidePlotX(tMs: number, window: TideVisibleWindow, padL: number, innerW: number): number {
  const u = (tMs - window.startMs) / window.spanMs;
  return padL + Math.max(0, Math.min(1, u)) * innerW;
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
