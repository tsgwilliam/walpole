/**
 * Locked geography for Walpole Bay Tidal Pool (1 Oct 2026).
 *
 * Datum: Margate Chart Datum = Ordnance Datum Newlyn − 2.50 m,
 * so Z_CD = Z_ODN + 2.50. PLA Tide Booklet 2024 and 2025, Margate row.
 * Same offset as Admiralty Tide Tables Table III / UKHO practice.
 *
 * Origin: middle of the seaward wall crest.
 * X east, Y north, Z up in metres Chart Datum.
 *
 * The ink plan is still the Historic England listing (a closed U).
 * The measured crest bar and the other points are the lock, not that schematic.
 */

export const MARGATE_CD_OFFSET_M = 2.5;

/** Metres above Chart Datum from metres above Ordnance Datum Newlyn. */
export function heightCdFromOdn(heightOdnM: number): number {
  return heightOdnM + MARGATE_CD_OFFSET_M;
}

/** Metres above Ordnance Datum Newlyn from metres above Chart Datum. */
export function heightOdnFromCd(heightCdM: number): number {
  return heightCdM - MARGATE_CD_OFFSET_M;
}

/** Middle of the seaward wall crest. Local (0, 0, 3.50). */
export const LOCAL_ORIGIN = {
  name: "seaward_wall_crest_centre",
  osgbE: 636913.0,
  osgbN: 171594.5,
  /** Working crest, metres Chart Datum. This is wallTopMetresCD. */
  z: 3.5,
  /** EA DTM 2020 core mean, before the working round to 3.50. */
  measuredMeanCD: 3.46,
  horizontalUncertaintyM: 2,
  verticalUncertaintyM: 0.2,
  note: "Mid-point of the seaward crest from the EA 2020 DTM, core samples with northing at least 171580. Not the pool centroid.",
} as const;

/** OSM way 98464382. The centroid is a reference, not the origin. */
export const OSM_OUTLINE = {
  wayId: 98464382,
  eMin: 636831,
  eMax: 637011,
  nMin: 171436,
  nMax: 171603,
  centroidE: 636921,
  centroidN: 171519.5,
} as const;

/**
 * Working crest. Measured core mean is about 3.46 m CD; the app uses 3.50.
 * Overflow stays six inches under the crest. Chalk is inferred and uncertain:
 * the 2020 pool surface at about 3.27 m CD is water, not the floor.
 */
export const WORKING_WALL = {
  crestMetresCD: 3.5,
  crestMeasuredMeanCD: 3.46,
  crestUncertaintyM: 0.2,
  overflowBelowCrestM: 0.15,
  overflowMetresCD: 3.35,
  overflowUncertaintyM: 0.25,
  chalkMetresCD: 1.4,
  chalkUncertaintyM: 0.4,
  /** Crest minus inferred chalk. Historic England's "about seven feet" is 2.13 m. */
  wallAboveChalkM: 2.1,
  heWallAboveChalkM: 2.13,
  /** Held water on the 2020 DTM inside the pool. Not chalk. */
  poolLidarWaterCD: 3.27,
} as const;

/** Soft sand inland of the south lip, then a hard step to the promenade. */
export const SOFT_BEACH = {
  grade: 0.12,
  runM: 35,
  gradeLow: 0.11,
  gradeHigh: 0.15,
  /** Promenade / cliff just inland of the soft strip. Context, not a pool wall. */
  promenadeMetresCD: 18,
  source:
    "EA DTM 2020. About 11–15% over about 35 m south of the pool lip, then a hard step to the promenade at about 18 m CD.",
} as const;

/**
 * Historic England list description (1421296 / Kent HER DKE22446).
 * These close the ink U. The measured seaward crest bar is longer, about 102 m.
 */
export const LISTING_PLAN = {
  landwardM: 168,
  seawardM: 91,
  sideM: 137,
} as const;

/** Margate standard levels, metres Chart Datum. ATT-aligned working set. */
export const TIDE_LEVELS_CD = {
  HAT: 5.1,
  MHWS: 4.8,
  MHWN: 3.9,
  MLWN: 1.4,
  MLWS: 0.5,
} as const;

export type Xyz = { x: number; y: number; z: number };

export type LockedPoint = {
  name: string;
  osgbE: number;
  osgbN: number;
  x: number;
  y: number;
  z: number;
  kind: string;
  source: string;
  notes: string;
  horizontalUncertaintyM: number;
  verticalUncertaintyM: number;
  uncertain?: boolean;
};

/**
 * Points from the 1 Oct 2026 lock. Local x, y, z are Chart Datum metres
 * from the seaward crest. Do not treat an uncertain row as a surveyed floor.
 */
export const LOCKED_POINTS: readonly LockedPoint[] = [
  {
    name: "seaward_wall_crest_centre",
    osgbE: 636913.0,
    osgbN: 171594.5,
    x: 0,
    y: 0,
    z: 3.5,
    kind: "origin",
    source: "EA DTM 2020-09-19/20 (tile DTM_F0218297); mid of core seaward crest where N≥171580",
    notes:
      "Local origin. Working Z is wallTopMetresCD 3.50. Measured mean crest about 3.46 m CD. One-metre lidar under-samples a wall about 0.6–0.9 m thick.",
    horizontalUncertaintyM: 2,
    verticalUncertaintyM: 0.2,
  },
  {
    name: "seaward_wall_crest_west",
    osgbE: 636862.0,
    osgbN: 171584.5,
    x: -51,
    y: -10,
    z: 3.47,
    kind: "wall_crest",
    source: "EA DTM 2020 crest detection (core N≥171580 western end)",
    notes: "Western end of the detected seaward crest. Core easting span about 102 m. The listing seaward wall is about 91 m.",
    horizontalUncertaintyM: 3,
    verticalUncertaintyM: 0.25,
  },
  {
    name: "seaward_wall_crest_east",
    osgbE: 636964.0,
    osgbN: 171581.5,
    x: 51,
    y: -13,
    z: 3.47,
    kind: "wall_crest",
    source: "EA DTM 2020 crest detection (core N≥171580 eastern end)",
    notes: "Eastern end of the detected seaward crest.",
    horizontalUncertaintyM: 3,
    verticalUncertaintyM: 0.25,
  },
  {
    name: "west_wall_midpoint",
    osgbE: 636849.0,
    osgbN: 171510.0,
    x: -64,
    y: -84.5,
    z: 3.42,
    kind: "wall_crest",
    source: "EA DTM 2020 east–west local max near the OSM west edge",
    notes: "Approximate midpoint of the west side wall. Side walls are hard to see at 1 m.",
    horizontalUncertaintyM: 4,
    verticalUncertaintyM: 0.3,
  },
  {
    name: "east_wall_midpoint",
    osgbE: 636994.0,
    osgbN: 171500.0,
    x: 81,
    y: -94.5,
    z: 3.42,
    kind: "wall_crest",
    source: "EA DTM 2020 east–west local max near the OSM east edge",
    notes: "Approximate midpoint of the east side wall. The easting is noisier than the west.",
    horizontalUncertaintyM: 5,
    verticalUncertaintyM: 0.3,
  },
  {
    name: "beach_toe_south_lip",
    osgbE: 636920.0,
    osgbN: 171436.0,
    x: 7,
    y: -158.5,
    z: 3.3,
    kind: "lip",
    source: "OSM way 98464382 south extent N≈171436; EA DTM 2020 height at that northing",
    notes: "Open beach end of the pool. The height is near held water, not dry chalk.",
    horizontalUncertaintyM: 5,
    verticalUncertaintyM: 0.25,
  },
  {
    name: "soft_beach_sample_near_lip",
    osgbE: 636920.0,
    osgbN: 171430.0,
    x: 7,
    y: -164.5,
    z: 3.36,
    kind: "beach",
    source: "EA DTM 2020 north–south at E 636920",
    notes: "Just inland of the south lip, still near the pool surface.",
    horizontalUncertaintyM: 2,
    verticalUncertaintyM: 0.2,
  },
  {
    name: "soft_beach_sample_mid",
    osgbE: 636920.0,
    osgbN: 171420.0,
    x: 7,
    y: -174.5,
    z: 3.94,
    kind: "beach",
    source: "EA DTM 2020 north–south at E 636920",
    notes: "Middle of the soft strip, about 10 m inland of the lip.",
    horizontalUncertaintyM: 2,
    verticalUncertaintyM: 0.2,
  },
  {
    name: "soft_beach_sample_upper",
    osgbE: 636920.0,
    osgbN: 171410.0,
    x: 7,
    y: -184.5,
    z: 6.67,
    kind: "beach",
    source: "EA DTM 2020 north–south at E 636920",
    notes: "Upper soft strip, where the grade steepens toward the promenade.",
    horizontalUncertaintyM: 2,
    verticalUncertaintyM: 0.25,
  },
  {
    name: "promenade_cliff_hint",
    osgbE: 636920.0,
    osgbN: 171390.0,
    x: 7,
    y: -204.5,
    z: 17.9,
    kind: "cliff",
    source: "EA DTM 2020 north–south at E 636920",
    notes: "Promenade or cliff top south of the soft beach, about 18 m CD. Context only, not pool structure.",
    horizontalUncertaintyM: 3,
    verticalUncertaintyM: 0.5,
  },
  {
    name: "promenade_cliff_top",
    osgbE: 636920.0,
    osgbN: 171380.0,
    x: 7,
    y: -214.5,
    z: 18.51,
    kind: "cliff",
    source: "EA DTM 2020 north–south at E 636920",
    notes: "Cliff or promenade continuing inland.",
    horizontalUncertaintyM: 3,
    verticalUncertaintyM: 0.5,
  },
  {
    name: "inferred_chalk_floor_seaward",
    osgbE: 636913.0,
    osgbN: 171564.5,
    x: 0,
    y: -30,
    z: 1.4,
    kind: "floor_inferred",
    source: "Historic England wall about 2.1 m above chalk, plus crest 3.5 m CD. Not seen in lidar.",
    notes:
      "Uncertain. The lidar pool interior at about 3.27 m CD is held water. Schematic chalk is crest minus 2.1 m. Placed about 30 m south of the crest, inside the pool.",
    horizontalUncertaintyM: 10,
    verticalUncertaintyM: 0.4,
    uncertain: true,
  },
  {
    name: "pool_lidar_water_surface",
    osgbE: 636913.0,
    osgbN: 171554.5,
    x: 0,
    y: -40,
    z: 3.27,
    kind: "water_surface_lidar",
    source: "EA DTM 2020 median inside the pool (wet)",
    notes: "Flat lidar surface inside the pool. Treat as water, not chalk. Crest minus this surface is about 0.15–0.22 m, near the six-inch overflow.",
    horizontalUncertaintyM: 5,
    verticalUncertaintyM: 0.15,
  },
  {
    name: "foreshore_north_of_crest",
    osgbE: 636913.0,
    osgbN: 171619.5,
    x: 0,
    y: 25,
    z: 0.33,
    kind: "foreshore",
    source: "EA DTM 2020 median 5–50 m north of the mid crest",
    notes: "Foreshore north of the wall. Crest minus foreshore is about 2.9–3.1 m on the central wall.",
    horizontalUncertaintyM: 5,
    verticalUncertaintyM: 0.25,
  },
  {
    name: "ref_MHWS",
    osgbE: LOCAL_ORIGIN.osgbE,
    osgbN: LOCAL_ORIGIN.osgbN,
    x: 0,
    y: 0,
    z: TIDE_LEVELS_CD.MHWS,
    kind: "tide_datum",
    source: "UKHO / Admiralty Margate tidal levels. PLA Tide Booklet 2024/2025 also lists MHWS 4.8 m CD.",
    notes: "Mean high water springs.",
    horizontalUncertaintyM: 0,
    verticalUncertaintyM: 0.1,
  },
  {
    name: "ref_MHWN",
    osgbE: LOCAL_ORIGIN.osgbE,
    osgbN: LOCAL_ORIGIN.osgbN,
    x: 0,
    y: 0,
    z: TIDE_LEVELS_CD.MHWN,
    kind: "tide_datum",
    source: "UKHO / Admiralty Margate. PLA lists MHWN 4.0 m CD. Working value is the ATT 3.9 m.",
    notes: "Mean high water neaps. The 3.5 m crest sits below this, so the wall is submerged on every tide.",
    horizontalUncertaintyM: 0,
    verticalUncertaintyM: 0.1,
  },
  {
    name: "ref_MLWN",
    osgbE: LOCAL_ORIGIN.osgbE,
    osgbN: LOCAL_ORIGIN.osgbN,
    x: 0,
    y: 0,
    z: TIDE_LEVELS_CD.MLWN,
    kind: "tide_datum",
    source: "UKHO / Admiralty Margate. PLA lists MLWN 1.3 m CD.",
    notes: "Mean low water neaps.",
    horizontalUncertaintyM: 0,
    verticalUncertaintyM: 0.1,
  },
  {
    name: "ref_MLWS",
    osgbE: LOCAL_ORIGIN.osgbE,
    osgbN: LOCAL_ORIGIN.osgbN,
    x: 0,
    y: 0,
    z: TIDE_LEVELS_CD.MLWS,
    kind: "tide_datum",
    source: "UKHO / Admiralty Margate. PLA lists MLWS 0.6 m CD.",
    notes: "Mean low water springs.",
    horizontalUncertaintyM: 0,
    verticalUncertaintyM: 0.1,
  },
  {
    name: "ref_HAT",
    osgbE: LOCAL_ORIGIN.osgbE,
    osgbN: LOCAL_ORIGIN.osgbN,
    x: 0,
    y: 0,
    z: TIDE_LEVELS_CD.HAT,
    kind: "tide_datum",
    source: "PLA Tide Booklet 2024/2025, Margate.",
    notes: "Highest astronomical tide. Context only.",
    horizontalUncertaintyM: 0,
    verticalUncertaintyM: 0.1,
  },
];

/** Measured seaward crest, about 10 m apart. Not the ink U. */
export const SEAWARD_CREST_POLYLINE: readonly Xyz[] = [
  { x: -51, y: -10, z: 3.47 },
  { x: -41, y: -3, z: 3.47 },
  { x: -31, y: -5, z: 3.32 },
  { x: -21, y: -1, z: 3.45 },
  { x: -11, y: -1, z: 3.45 },
  { x: -1, y: 0, z: 3.48 },
  { x: 9, y: 1, z: 3.48 },
  { x: 19, y: 2, z: 3.49 },
  { x: 29, y: 4, z: 3.47 },
  { x: 39, y: 5, z: 3.5 },
  { x: 49, y: -8, z: 3.49 },
  { x: 51, y: -13, z: 3.47 },
];

export function keyPoints(): readonly LockedPoint[] {
  return LOCKED_POINTS;
}

export function lockedPoint(name: string): LockedPoint | undefined {
  return LOCKED_POINTS.find((point) => point.name === name);
}

export function localFromOsgb(
  easting: number,
  northing: number,
  z: number | null,
): { x: number; y: number; z: number | null } {
  return {
    x: easting - LOCAL_ORIGIN.osgbE,
    y: northing - LOCAL_ORIGIN.osgbN,
    z,
  };
}

/** Beach-to-sea distance of the listing trapezoid, metres. */
export function poolDepthM(): number {
  const overhang = (LISTING_PLAN.landwardM - LISTING_PLAN.seawardM) / 2;
  const under = LISTING_PLAN.sideM * LISTING_PLAN.sideM - overhang * overhang;
  if (!(under > 0)) throw new Error("Listing lengths do not close a pool plan.");
  return Math.sqrt(under);
}

/**
 * Ink outline, north-up. Listing lengths, origin on the seaward crest.
 * First point is north-west, then north-east, south-east, south-west.
 * Z is the working crest: a schematic, not a levelled beach.
 */
export function poolOutline(): Xyz[] {
  const depth = poolDepthM();
  const halfLand = LISTING_PLAN.landwardM / 2;
  const halfSea = LISTING_PLAN.seawardM / 2;
  const z = WORKING_WALL.crestMetresCD;
  return [
    { x: -halfSea, y: 0, z },
    { x: halfSea, y: 0, z },
    { x: halfLand, y: -depth, z },
    { x: -halfLand, y: -depth, z },
  ];
}

/**
 * Crest line of the ink U: west beach end, west wall, seaward wall, east wall.
 * The south side is open. Listing lengths, not the measured crest bar.
 */
export function wallPlanPolyline(): Xyz[] {
  const [nw, ne, se, sw] = poolOutline();
  return [sw, nw, ne, se];
}

/** Area centroid of the ink pool. Nearer the wider beach opening. */
export function poolCentroidLocal(): Xyz {
  const depth = poolDepthM();
  const { landwardM, seawardM } = LISTING_PLAN;
  const southOfCrest = (depth * (seawardM + 2 * landwardM)) / (3 * (seawardM + landwardM));
  return { x: 0, y: -southOfCrest, z: WORKING_WALL.poolLidarWaterCD };
}
