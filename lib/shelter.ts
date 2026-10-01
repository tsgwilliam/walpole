/**
 * Rough quieter-water guess for the plan.
 *
 * Not a wave model and not a swim route. Very light wind: the whole pool
 * can read quiet. As the wind rises, the quiet patch shrinks toward the
 * upwind side — the lee of whatever is sheltering that side. A southerly
 * leaves the beach end quieter. The cliff already softens southerlies in
 * the chop pilot; that only widens this band a little.
 */

import { southerlyShelter } from "./chop";
import { compassFromDegrees } from "./compass";
import { poolOutline, type Xyz } from "./geography";

type PlanPoint = { x: number; y: number };

/** At or below this mean, the whole pool is the quiet patch. Metres per second. */
export const QUIET_CALM_MS = 2.5;

/** By this speed the patch has shrunk to a lee strip. */
export const QUIET_STRONG_MS = 14;

export const QUIET_LABEL = "quieter (rough guess)";

export type QuietZone = {
  /** The hatch covers the whole pool. */
  whole: boolean;
  /** Share of the pool's width along the wind, from the upwind side. */
  fraction: number;
  polygon: PlanPoint[];
};

function outlinePoints(): PlanPoint[] {
  return poolOutline().map((point: Xyz) => ({ x: point.x, y: point.y }));
}

/** Mean, plus a fraction of the gust above it, so a gusty hour shrinks the patch. */
export function quietSpeedMs(speedMs: number, gustMs: number | null): number {
  const speed = Number.isFinite(speedMs) ? Math.max(0, speedMs) : 0;
  if (gustMs == null || !Number.isFinite(gustMs)) return speed;
  return speed + Math.max(0, gustMs - speed) * 0.35;
}

/**
 * 1 is the whole pool. Smaller values hug the upwind side.
 * A southerly keeps a wider band than the same speed off the sea.
 */
export function quietFraction(speedMs: number, cliffShelter: boolean): number {
  if (!(speedMs > QUIET_CALM_MS)) return 1;
  const t = Math.min(1, (speedMs - QUIET_CALM_MS) / (QUIET_STRONG_MS - QUIET_CALM_MS));
  const eased = t * t * (3 - 2 * t);
  const wide = cliffShelter ? 0.84 : 0.72;
  const thin = cliffShelter ? 0.36 : 0.18;
  return thin + (1 - eased) * (wide - thin);
}

function clipHalfPlane(poly: PlanPoint[], nx: number, ny: number, minDot: number): PlanPoint[] {
  const out: PlanPoint[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = a.x * nx + a.y * ny;
    const db = b.x * nx + b.y * ny;
    const aIn = da >= minDot - 1e-8;
    const bIn = db >= minDot - 1e-8;
    const pushEdge = () => {
      const denom = db - da;
      if (Math.abs(denom) < 1e-12) return;
      const t = (minDot - da) / denom;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    };
    if (aIn && bIn) out.push(b);
    else if (aIn && !bIn) pushEdge();
    else if (!aIn && bIn) {
      pushEdge();
      out.push(b);
    }
  }
  return out;
}

/** Area-weighted centre, for a label. Falls back to the vertex average. */
export function polygonCentroid(poly: PlanPoint[]): PlanPoint {
  let twice = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    twice += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(twice) < 1e-8 || poly.length === 0) {
    const n = poly.length || 1;
    return {
      x: poly.reduce((sum, point) => sum + point.x, 0) / n,
      y: poly.reduce((sum, point) => sum + point.y, 0) / n,
    };
  }
  return { x: cx / (3 * twice), y: cy / (3 * twice) };
}

export function polygonArea(poly: PlanPoint[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const q = poly[(i + 1) % poly.length];
    sum += poly[i].x * q.y - q.x * poly[i].y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Quieter patch in plan metres (X east, Y north, origin on the seaward crest).
 * Null when the wind has strength but no direction — no invented lee.
 */
export function quieterZone(input: {
  fromDeg: number | null;
  speedMs: number;
  gustMs: number | null;
  compass: string | null;
}): QuietZone | null {
  const outline = outlinePoints();
  const speed = quietSpeedMs(input.speedMs, input.gustMs);
  const compass =
    input.compass ||
    (input.fromDeg != null && Number.isFinite(input.fromDeg) ? compassFromDegrees(input.fromDeg).short : "");
  const fraction = quietFraction(speed, southerlyShelter(compass));
  if (fraction >= 0.999) return { whole: true, fraction: 1, polygon: outline };
  if (input.fromDeg == null || !Number.isFinite(input.fromDeg)) return null;

  const rad = (input.fromDeg * Math.PI) / 180;
  const upE = Math.sin(rad);
  const upN = Math.cos(rad);
  const dots = outline.map((point) => point.x * upE + point.y * upN);
  const max = Math.max(...dots);
  const min = Math.min(...dots);
  const cut = max - fraction * (max - min);
  const polygon = clipHalfPlane(outline, upE, upN, cut);
  if (polygon.length < 3) return null;
  return { whole: false, fraction, polygon };
}
