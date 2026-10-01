/**
 * Plan arrow lengths. The arrow points the way the wind is blowing.
 * The solid shaft is the mean. A lighter shaft past the head is the gust.
 * Lengths are SVG user units on the glance plan, capped so the mark stays
 * in the pool.
 */

const MEAN_CAP = 46;
const GUST_CAP = 58;

function shaft(metresPerSecond: number): number {
  const speed = Number.isFinite(metresPerSecond) ? Math.max(0, metresPerSecond) : 0;
  return Math.min(MEAN_CAP, 12 + speed * 2.4);
}

export function windGlyphLengths(avgMs: number, gustMs: number | null): { mean: number; gust: number } {
  const mean = shaft(avgMs);
  if (gustMs == null || !Number.isFinite(gustMs) || gustMs <= avgMs + 0.05) {
    return { mean, gust: mean };
  }
  const gust = Math.min(GUST_CAP, Math.max(mean + 8, 12 + gustMs * 2.4));
  return { mean, gust };
}
