/**
 * Plan arrow. The arrow points the way the wind is blowing.
 * The solid shaft is the mean. A lighter shaft past the head is the gust.
 * Lengths are SVG user units on the glance plan, capped so the mark stays
 * in the pool. Colour and thickness follow the same speeds: soft cool ink
 * when it is light, sand when it is fresh, coral in a gale.
 */

const MEAN_CAP = 46;
const GUST_CAP = 58;

/** Tributary ink, a cool slate, sand, and coral. No extra hues. */
const COLOUR_STOPS: { ms: number; rgb: [number, number, number] }[] = [
  { ms: 0, rgb: [94, 88, 78] },
  { ms: 3, rgb: [61, 84, 102] },
  { ms: 7, rgb: [90, 74, 58] },
  { ms: 11, rgb: [184, 106, 40] },
  { ms: 16, rgb: [196, 71, 54] },
  { ms: 24, rgb: [138, 42, 32] },
];

function finiteSpeed(metresPerSecond: number): number {
  return Number.isFinite(metresPerSecond) ? Math.max(0, metresPerSecond) : 0;
}

function shaft(metresPerSecond: number): number {
  const speed = finiteSpeed(metresPerSecond);
  const t = Math.min(1, speed / 24);
  const eased = Math.pow(t, 0.72);
  return 10 + (MEAN_CAP - 10) * eased;
}

function strokeWidth(metresPerSecond: number): number {
  const t = Math.min(1, finiteSpeed(metresPerSecond) / 22);
  return 1.2 + 2.1 * Math.pow(t, 0.85);
}

function headSize(metresPerSecond: number): number {
  const t = Math.min(1, finiteSpeed(metresPerSecond) / 22);
  return 6 + 5.5 * Math.pow(t, 0.8);
}

function hex(rgb: [number, number, number]): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Ink for one speed. Stops are the skin colours; the gaps are mixed. */
export function windInk(metresPerSecond: number): string {
  const speed = finiteSpeed(metresPerSecond);
  const first = COLOUR_STOPS[0];
  if (speed <= first.ms) return hex(first.rgb);
  const last = COLOUR_STOPS[COLOUR_STOPS.length - 1];
  if (speed >= last.ms) return hex(last.rgb);
  for (let i = 1; i < COLOUR_STOPS.length; i++) {
    const next = COLOUR_STOPS[i];
    if (speed > next.ms) continue;
    const prev = COLOUR_STOPS[i - 1];
    const t = (speed - prev.ms) / (next.ms - prev.ms);
    const rgb = prev.rgb.map((channel, index) => Math.round(channel + (next.rgb[index] - channel) * t)) as [
      number,
      number,
      number,
    ];
    return hex(rgb);
  }
  return hex(last.rgb);
}

export function windGlyphLengths(avgMs: number, gustMs: number | null): { mean: number; gust: number } {
  const mean = shaft(avgMs);
  if (gustMs == null || !Number.isFinite(gustMs) || gustMs <= avgMs + 0.05) {
    return { mean, gust: mean };
  }
  const gust = Math.min(GUST_CAP, Math.max(mean + 8, shaft(gustMs)));
  return { mean, gust };
}

export type WindGlyphMark = {
  mean: number;
  gust: number;
  meanWidth: number;
  gustWidth: number;
  head: number;
  meanColour: string;
  gustColour: string;
};

export function windGlyphMark(avgMs: number, gustMs: number | null): WindGlyphMark {
  const { mean, gust } = windGlyphLengths(avgMs, gustMs);
  const gustSpeed = gustMs != null && Number.isFinite(gustMs) ? gustMs : avgMs;
  const meanWidth = strokeWidth(avgMs);
  return {
    mean,
    gust,
    meanWidth,
    gustWidth: Math.max(0.95, strokeWidth(gustSpeed) * 0.72),
    head: headSize(avgMs),
    meanColour: windInk(avgMs),
    gustColour: windInk(gustSpeed),
  };
}
