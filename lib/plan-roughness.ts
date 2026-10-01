import type { ChopLevel } from "./chop";
import type { PlanPoint } from "./pool-plan";
import { polygonArea } from "./shelter";

/** Vertical gap between wind-aligned chop strokes, in plan SVG units. */
export const PLAN_CHOP_ROW_GAP = 13;

/** 0 calm wash, 1 full chop symbols for this level. */
export function chopRoughness(level: ChopLevel): number {
  return (level - 1) / 4;
}

/**
 * Plan roughness before the quiet patch. Under 2.5 m/s a sheltered step-down
 * to bathwater stays blank. Above that, a light breeze still leaves sparse
 * strokes — the cliff temper is the quiet patch, not an empty pool.
 */
export function planBaseRoughness(level: ChopLevel, meanMs: number): number {
  const fromChop = chopRoughness(level);
  const ms = Number.isFinite(meanMs) ? Math.max(0, meanMs) : 0;
  if (ms < 2.5) return fromChop;
  return Math.max(fromChop, 0.22);
}

function pointInPoly(point: PlanPoint, poly: PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Roughness 0–1 at a plan point. Quiet polygon is calm; outside scales with chop.
 * `whole` quiet still leaves a faint wash when chop is high.
 */
export function roughnessAt(
  point: PlanPoint,
  chopLevel: ChopLevel,
  quiet: { whole: boolean; polygon: PlanPoint[] } | null,
  meanMs = 0,
): number {
  const base = planBaseRoughness(chopLevel, meanMs);
  if (base < 0.02) return 0;
  if (!quiet) return base;
  if (quiet.whole) return base * 0.12;
  if (pointInPoly(point, quiet.polygon)) return base * 0.06;
  return base;
}

/** Plan ink strength from mean wind (m/s). Calm stays soft; a gale does not pile on. */
export function planWindRoughBoost(meanMs: number): number {
  const ms = Number.isFinite(meanMs) ? Math.max(0, meanMs) : 0;
  if (ms < 2.5) return 0;
  if (ms < 8) return (ms - 2.5) * 0.025;
  return 0.14 + Math.min(0.2, (ms - 8) * 0.018);
}

/**
 * Stroke look for one chop row. Amplitude stays under half the row gap so
 * neighbouring waves do not braid into a moiré.
 */
export function planChopInk(rough: number): { opacity: number; width: number; amp: number } | null {
  if (!(rough >= 0.08)) return null;
  return {
    amp: Math.min(PLAN_CHOP_ROW_GAP * 0.18, 0.7 + rough * 1.35),
    opacity: Math.min(0.78, 0.46 + rough * 0.32),
    width: 1.15 + Math.min(1, rough) * 0.55,
  };
}

/** Offset of a chop-local point under SVG `rotate(travelDeg)` (y grows downward). */
export function chopLocalToScreen(lx: number, ly: number, travelDeg: number): { x: number; y: number } {
  const rad = (travelDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
}

export function waveScanline(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  phase: number,
  step: number,
): string {
  if (x1 - x0 < 4 || amp < 0.2) return "";
  let d = "";
  let i = 0;
  for (let x = x0; x <= x1; x += step) {
    const wobble = Math.sin(x * 0.11 + phase) * amp + Math.sin(x * 0.23 - phase * 0.7) * amp * 0.45;
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(y + wobble).toFixed(1)}`;
    i += 1;
  }
  return d;
}

export function poolAreaM2(outline: PlanPoint[]): number {
  return polygonArea(outline);
}
