import type { ChopLevel } from "./chop";
import type { PlanPoint } from "./pool-plan";
import { polygonArea } from "./shelter";

/** 0 calm wash, 1 full chop symbols for this level. */
export function chopRoughness(level: ChopLevel): number {
  return (level - 1) / 4;
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
): number {
  const base = chopRoughness(chopLevel);
  if (base < 0.02) return 0;
  if (!quiet) return base;
  if (quiet.whole) return base * 0.12;
  if (pointInPoly(point, quiet.polygon)) return base * 0.06;
  return base;
}

/** Wavy ink along one line in screen space (used inside a rotated group). */
export function waveScanline(
  x0: number,
  x1: number,
  y: number,
  amp: number,
  phase: number,
  step: number,
): string {
  if (x1 - x0 < 4 || amp < 0.35) return "";
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
