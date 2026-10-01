/**
 * Schematic plan of Walpole tidal pool, in the local frame from geography.
 *
 * Origin is the middle of the seaward wall crest. X is east, Y is north.
 * Lengths are the Historic England listing. The drawing exaggerates the
 * wall's thickness. Sea is north. The beach, and the cliff, are south.
 * The south side is open; the wall is a U.
 */
import { LISTING_PLAN, poolCentroidLocal, poolDepthM, poolOutline } from "./geography";

export const POOL_PLAN = LISTING_PLAN;

export type PlanPoint = { x: number; y: number };

/** Perpendicular beach-to-sea distance, metres. Throws if the lengths cannot close. */
export function poolPlanDepthM(): number {
  return poolDepthM();
}

/**
 * North-up metres. Origin is the middle of the seaward crest.
 * +y is north. The beach opening is south, at a negative y.
 */
export function poolPlanCorners(): {
  nw: PlanPoint;
  ne: PlanPoint;
  se: PlanPoint;
  sw: PlanPoint;
  depthM: number;
} {
  const [nw, ne, se, sw] = poolOutline();
  return {
    nw: { x: nw.x, y: nw.y },
    ne: { x: ne.x, y: ne.y },
    se: { x: se.x, y: se.y },
    sw: { x: sw.x, y: sw.y },
    depthM: poolDepthM(),
  };
}

/** Area centroid, metres. Sits in the water, nearer the wider beach opening. */
export function poolPlanCentroid(): PlanPoint {
  const centroid = poolCentroidLocal();
  return { x: centroid.x, y: centroid.y };
}

export type PlanLayout = {
  scale: number;
  originX: number;
  originY: number;
};

/** Fit the pool into a view box. +y in the box is south (north stays up). */
export function planLayout(
  viewW: number,
  viewH: number,
  pad: { l: number; r: number; t: number; b: number },
): PlanLayout {
  const corners = poolPlanCorners();
  const xs = [corners.nw.x, corners.ne.x, corners.se.x, corners.sw.x];
  const ys = [corners.nw.y, corners.ne.y, corners.se.y, corners.sw.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const innerW = viewW - pad.l - pad.r;
  const innerH = viewH - pad.t - pad.b;
  const scale = Math.min(innerW / width, innerH / height);
  const drawnW = width * scale;
  const drawnH = height * scale;
  return {
    scale,
    originX: pad.l + (innerW - drawnW) / 2 - minX * scale,
    originY: pad.t + (innerH - drawnH) / 2 + maxY * scale,
  };
}

export function planProject(point: PlanPoint, layout: PlanLayout): PlanPoint {
  return {
    x: layout.originX + point.x * layout.scale,
    y: layout.originY - point.y * layout.scale,
  };
}
