/**
 * Schematic plan of Walpole tidal pool.
 *
 * Lengths are the Historic England list description (1421296 / Kent HER
 * DKE22446): seaward wall about 91 m, landward opening about 168 m, beach-to-sea
 * sides about 137 m. They close as a trapezoid. This is not a survey of the
 * outline, and the drawing exaggerates the wall's thickness so the line reads.
 * Sea is north. The beach, and the cliff, are south.
 */
export const POOL_PLAN = {
  landwardM: 168,
  seawardM: 91,
  sideM: 137,
} as const;

export type PlanPoint = { x: number; y: number };

/** Perpendicular beach-to-sea distance, metres. Throws if the lengths cannot close. */
export function poolPlanDepthM(): number {
  const overhang = (POOL_PLAN.landwardM - POOL_PLAN.seawardM) / 2;
  const under = POOL_PLAN.sideM * POOL_PLAN.sideM - overhang * overhang;
  if (!(under > 0)) throw new Error("Listing lengths do not close a pool plan.");
  return Math.sqrt(under);
}

/**
 * North-up metres. Origin is the middle of the landward opening.
 * +y is north, towards the sea.
 */
export function poolPlanCorners(): {
  nw: PlanPoint;
  ne: PlanPoint;
  se: PlanPoint;
  sw: PlanPoint;
  depthM: number;
} {
  const depthM = poolPlanDepthM();
  const halfLand = POOL_PLAN.landwardM / 2;
  const halfSea = POOL_PLAN.seawardM / 2;
  return {
    sw: { x: -halfLand, y: 0 },
    se: { x: halfLand, y: 0 },
    ne: { x: halfSea, y: depthM },
    nw: { x: -halfSea, y: depthM },
    depthM,
  };
}

/** Area centroid, metres. Sits in the water, nearer the wider beach opening. */
export function poolPlanCentroid(): PlanPoint {
  const { landwardM, seawardM } = POOL_PLAN;
  const depthM = poolPlanDepthM();
  return {
    x: 0,
    y: (depthM * (landwardM + 2 * seawardM)) / (3 * (landwardM + seawardM)),
  };
}

export type PlanLayout = {
  scale: number;
  originX: number;
  originY: number;
};

/** Fit the landward width and the depth into a view box. +y in the box is south. */
export function planLayout(
  viewW: number,
  viewH: number,
  pad: { l: number; r: number; t: number; b: number },
): PlanLayout {
  const depth = poolPlanDepthM();
  const innerW = viewW - pad.l - pad.r;
  const innerH = viewH - pad.t - pad.b;
  const scale = Math.min(innerW / POOL_PLAN.landwardM, innerH / depth);
  const drawnW = POOL_PLAN.landwardM * scale;
  const drawnH = depth * scale;
  return {
    scale,
    originX: pad.l + (innerW - drawnW) / 2 + drawnW / 2,
    originY: pad.t + (innerH - drawnH) / 2 + drawnH,
  };
}

export function planProject(point: PlanPoint, layout: PlanLayout): PlanPoint {
  return {
    x: layout.originX + point.x * layout.scale,
    y: layout.originY - point.y * layout.scale,
  };
}
