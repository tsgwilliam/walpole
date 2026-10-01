/**
 * Working geography for Walpole Bay Tidal Pool.
 *
 * Datum is Margate Chart Datum: height_CD = height_ODN + 2.50
 * (PLA 2024 working figure; Admiralty Tide Tables confirmation still to come).
 *
 * Local frame: origin at the middle of the seaward wall crest.
 * X is east, Y is north, Z is up in metres Chart Datum.
 * Horizontal lengths of the pool are the Historic England listing, not a
 * surveyed outline. Heights are the 1 Oct 2026 lidar notes, provisional.
 */

export const MARGATE_CD_OFFSET_M = 2.5;

/** Metres above Chart Datum from metres above Ordnance Datum Newlyn. */
export function heightCdFromOdn(heightOdnM: number): number {
  return heightOdnM + MARGATE_CD_OFFSET_M;
}

/** Middle of the seaward wall crest. The plan's (0, 0). */
export const LOCAL_ORIGIN = {
  name: "Middle of the seaward wall crest",
  /** Approximate OSGB36 easting. Middle of the central-wall scan. */
  osgbE: 636910,
  /** Approximate OSGB36 northing. Middle of the detected seaward-face band. */
  osgbN: 171595,
  /** Metres. The scan is 1 m pixels and the face band is wide. */
  horizontalUncertaintyM: 40,
  note: "Provisional. Easting is the middle of E 636860–636960 in the 1 Oct 2026 notes (written there as 63686–63696). Northing is the middle of N 171560–171630. Not a surveyed station.",
} as const;

/** Published pin. NGR TR 3692 7151. */
export const SITE_PIN = {
  osgbE: 636920,
  osgbN: 171510,
  note: "Approximate site grid reference, not the wall crest.",
} as const;

/** OSM way 98464382, OSGB metres. */
export const OSM_OUTLINE = {
  eMin: 636831,
  eMax: 637011,
  nMin: 171436,
  nMax: 171603,
} as const;

/**
 * Working crest from the EA 2020 DTM. The old app seed was 4.00 m.
 * Overflow stays six inches under the crest. Chalk at the seaward wall is
 * inferred (crest minus the Historic England seven-foot wall); the 2020
 * lidar pool surface was water, not the floor.
 */
export const WORKING_WALL = {
  crestMetresCD: 3.5,
  crestUncertaintyM: 0.2,
  overflowBelowCrestM: 0.15,
  overflowMetresCD: 3.35,
  chalkMetresCD: 1.4,
  chalkUncertaintyM: 0.3,
  /** Crest minus inferred chalk. Historic England's "about seven feet" is 2.13 m. */
  wallAboveChalkM: 2.1,
  heWallAboveChalkM: 2.13,
} as const;

/** Soft sand inland of the landward lip, before the promenade. */
export const SOFT_BEACH = {
  grade: 0.12,
  runM: 35,
  gradeLow: 0.11,
  gradeHigh: 0.13,
  source:
    "EA DTM 2020. About 11–13% over 30–40 m south of the pool lip, then a hard step to the promenade.",
} as const;

/** Foreshore just north of the seaward wall. A strip, not one point. */
export const FORESHORE = {
  metresCD: 0.5,
  lowCD: 0.3,
  highCD: 0.8,
  source: "EA DTM 2020 median on the strip north of the wall, about 0.35–0.60 m, range about 0.3–0.8 m.",
} as const;

/**
 * Historic England list description (1421296 / Kent HER DKE22446).
 * Seaward wall, landward opening, beach-to-sea sides. They close a trapezoid.
 */
export const LISTING_PLAN = {
  landwardM: 168,
  seawardM: 91,
  sideM: 137,
} as const;

export type Xyz = { x: number; y: number; z: number };

export type LocalPoint = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number | null;
  zUncertaintyM: number | null;
  source: string;
};

/** Beach-to-sea distance, metres. Throws if the listing lengths cannot close. */
export function poolDepthM(): number {
  const overhang = (LISTING_PLAN.landwardM - LISTING_PLAN.seawardM) / 2;
  const under = LISTING_PLAN.sideM * LISTING_PLAN.sideM - overhang * overhang;
  if (!(under > 0)) throw new Error("Listing lengths do not close a pool plan.");
  return Math.sqrt(under);
}

/**
 * Water outline, north-up. First point is the north-west corner of the
 * seaward wall, then north-east, south-east, south-west.
 * Z is the working crest on every corner: a schematic, not a levelled beach.
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
 * Crest line of the closed U: west beach end, along the west wall, the
 * seaward wall, and the east wall, stopping at the east beach end.
 * The south side is open beach. Same corners as the outline.
 */
export function wallPlanPolyline(): Xyz[] {
  const [nw, ne, se, sw] = poolOutline();
  return [sw, nw, ne, se];
}

/** Area centroid. Nearer the wider beach opening than the seaward wall. */
export function poolCentroidLocal(): Xyz {
  const depth = poolDepthM();
  const { landwardM, seawardM } = LISTING_PLAN;
  const southOfCrest = (depth * (seawardM + 2 * landwardM)) / (3 * (seawardM + landwardM));
  return { x: 0, y: -southOfCrest, z: WORKING_WALL.chalkMetresCD };
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

/** Points the drawings and GEOGRAPHY.md share. Provisional. */
export function keyPoints(): LocalPoint[] {
  const [nw, ne, se, sw] = poolOutline();
  const depth = poolDepthM();
  const pin = localFromOsgb(SITE_PIN.osgbE, SITE_PIN.osgbN, null);
  const beachRise = SOFT_BEACH.grade * SOFT_BEACH.runM;
  return [
    {
      id: "seaward-crest",
      name: "Seaward wall crest, middle",
      x: 0,
      y: 0,
      z: WORKING_WALL.crestMetresCD,
      zUncertaintyM: WORKING_WALL.crestUncertaintyM,
      source: "EA DTM 2020-09-19/20, central seaward wall. Working value 3.5 m CD.",
    },
    {
      id: "seaward-west",
      name: "Seaward wall, west end",
      x: nw.x,
      y: nw.y,
      z: nw.z,
      zUncertaintyM: WORKING_WALL.crestUncertaintyM,
      source: "Listing half-length west of the crest origin. Height is the working crest, not a separate level.",
    },
    {
      id: "seaward-east",
      name: "Seaward wall, east end",
      x: ne.x,
      y: ne.y,
      z: ne.z,
      zUncertaintyM: WORKING_WALL.crestUncertaintyM,
      source: "Listing half-length east of the crest origin. Height is the working crest.",
    },
    {
      id: "beach-west",
      name: "West wall at the beach",
      x: sw.x,
      y: sw.y,
      z: null,
      zUncertaintyM: null,
      source: "Listing plan. The side wall meets the open beach. Height here is not surveyed.",
    },
    {
      id: "beach-east",
      name: "East wall at the beach",
      x: se.x,
      y: se.y,
      z: null,
      zUncertaintyM: null,
      source: "Listing plan. The side wall meets the open beach. Height here is not surveyed.",
    },
    {
      id: "chalk-floor",
      name: "Inferred chalk at the seaward wall",
      x: 0,
      y: 0,
      z: WORKING_WALL.chalkMetresCD,
      zUncertaintyM: WORKING_WALL.chalkUncertaintyM,
      source: "Crest minus about 2.1 m (Historic England, wall above chalk). The 2020 lidar floor was wet.",
    },
    {
      id: "soft-beach",
      name: "Soft beach, inland of the lip",
      x: 0,
      y: -(depth + SOFT_BEACH.runM),
      z: WORKING_WALL.chalkMetresCD + beachRise,
      zUncertaintyM: 0.6,
      source: `${SOFT_BEACH.source} Height assumes a flat chalk floor then the soft grade. Rough.`,
    },
    {
      id: "site-pin",
      name: "Published site pin",
      x: pin.x,
      y: pin.y,
      z: null,
      zUncertaintyM: null,
      source: SITE_PIN.note,
    },
  ];
}
