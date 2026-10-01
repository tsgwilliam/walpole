import type { ChopLevel } from "./chop";
import { SOFT_BEACH, WORKING_WALL } from "./geography";

/**
 * Schematic N–S section. Crest is 1. The chalk floor is 0.
 * Held-full is 6 inches under a wall about 7 feet high (Historic England
 * 1421296): 0.5 / 7 ≈ 0.93. The metre scale of the crest is the working
 * wall in geography (crest minus inferred chalk). Horizontal ratios are
 * beach : pool : wall : sea. Wall thickness is exaggerated.
 *
 * The beach is a short rise, then a flat floor. A surveyed 12% over 35 m
 * would leave this frame, so the ink rise is capped. It is not a wedge
 * running down through the pool.
 */
export const RATIO = { beach: 2.5, pool: 5, wall: 0.6, sea: 3.5 } as const;
export const RATIO_SUM = RATIO.beach + RATIO.pool + RATIO.wall + RATIO.sea;
export const HELD_FULL = 0.93;
export const WALL_HEIGHT_M = WORKING_WALL.wallAboveChalkM;
export const WALL_FACE_U = RATIO.beach + RATIO.pool + RATIO.wall;

const CLIFF_RUN = 0.28;

/** Page-fitted top of the soft beach, in schematic units. Crest is 1. */
function inkBeachTop(): number {
  const rise = (SOFT_BEACH.grade * SOFT_BEACH.runM) / WALL_HEIGHT_M;
  return Math.min(1.12, 0.7 + rise * 0.19);
}

export type PictureMode = "pool" | "overflow" | "sea" | "falling";

export type SectionInput = {
  /** `?mode=` QA override. Null follows the tide. */
  mode: PictureMode | null;
  seaMetresCD: number | null;
  wallTopMetresCD: number;
  falling: boolean;
  recentPeakMetresCD: number | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windMph: number | null;
  chopLevel: ChopLevel;
  compass: string | null;
};

export type ResolvedSection = {
  mode: PictureMode;
  /** Mean sea in schematic units, before the draw clamp. */
  sea: number;
  seaDraw: number;
  waveAmp: number;
  wavePeriodS: number;
  chopLevel: ChopLevel;
  poolBias: number;
  seaBias: number;
  /**
   * Schematic amplitude of wind chop on held water (pool and falling).
   * The sea side already has marine swell; this is the same chop pilot
   * stretched so the pool surface can be read on its own.
   */
  heldAmp: number;
};

const CANONICAL: Record<PictureMode, { sea: number; amp: number; period: number }> = {
  pool: { sea: 0.38, amp: 0.04, period: 6.4 },
  overflow: { sea: 0.965, amp: 0.095, period: 5.4 },
  sea: { sea: 1.12, amp: 0.05, period: 6.8 },
  falling: { sea: 0.62, amp: 0.035, period: 7.2 },
};

const ONSHORE = new Set(["N", "NNE", "NE", "ENE", "NW", "NNW", "WNW"]);
const SHELTER = new Set(["S", "SSE", "SSW", "SW", "WSW"]);

/**
 * Chalk profile. A short cliff step, a beach down to the landward lip,
 * a flat pool floor, then a slight drop on the foreshore.
 */
export function chalkSchematic(u: number): number {
  const lip = RATIO.beach;
  const sea0 = RATIO.beach + RATIO.pool + RATIO.wall;
  const beachTop = inkBeachTop();
  const cliffTop = Math.min(1.42, beachTop + 0.26);
  if (u <= 0) return cliffTop;
  if (u < CLIFF_RUN) {
    const t = u / CLIFF_RUN;
    return cliffTop + (beachTop - cliffTop) * t;
  }
  if (u < lip) {
    const t = (u - CLIFF_RUN) / (lip - CLIFF_RUN);
    return beachTop * (1 - t);
  }
  if (u <= sea0) return 0;
  const t = Math.min(1, (u - sea0) / (RATIO_SUM - sea0));
  return -0.08 * t;
}

export function segmentEdges(width: number) {
  const u = width / RATIO_SUM;
  const beach = RATIO.beach * u;
  const pool = RATIO.pool * u;
  const wall = RATIO.wall * u;
  return {
    beach0: 0,
    pool0: beach,
    wall0: beach + pool,
    sea0: beach + pool + wall,
    sea1: width,
    wallW: wall,
  };
}

/** Where the chalk slope crosses a still-water line. Null if the whole shore is under it. */
export function waterlineU(surface: number): number | null {
  const steps = 240;
  let prevU = 0;
  let prevH = chalkSchematic(0);
  if (prevH <= surface) return 0;
  for (let i = 1; i <= steps; i++) {
    const u = (i / steps) * RATIO_SUM;
    const h = chalkSchematic(u);
    if (prevH >= surface && h <= surface && prevH !== h) {
      const t = (prevH - surface) / (prevH - h);
      return prevU + (u - prevU) * t;
    }
    prevU = u;
    prevH = h;
  }
  return null;
}

export function metresToSchematic(seaMetresCD: number, wallTopMetresCD: number): number {
  return 1 - (wallTopMetresCD - seaMetresCD) / WALL_HEIGHT_M;
}

/** Marine swell when the feed has it, otherwise a mild stand-in from the wind. */
export function swellMetres(waveHeightM: number | null, windMph: number | null): number {
  if (waveHeightM != null && Number.isFinite(waveHeightM) && waveHeightM > 0) {
    return Math.min(2.4, waveHeightM);
  }
  if (windMph != null && Number.isFinite(windMph) && windMph > 0) {
    return Math.min(1.5, 0.08 + windMph / 32);
  }
  return 0.22;
}

export function chopBias(compass: string | null): { pool: number; sea: number } {
  const c = (compass || "").toUpperCase();
  if (SHELTER.has(c)) return { pool: 0.62, sea: 0.92 };
  if (ONSHORE.has(c)) return { pool: 1.08, sea: 1.18 };
  return { pool: 1, sea: 1 };
}

export function chopMotion(level: ChopLevel, bias: number) {
  const t = (level - 1) / 4;
  return {
    lines: 2 + level,
    amp: (0.005 + t * 0.016) * bias,
    speed: 0.7 + t * 1.8,
    wobble: 0.35 + t * 1,
  };
}

/**
 * Base ripple on held water, before shelter and a little extra from the
 * mean wind. Level 1 stays nearly flat. Level 5 is a rough surface that
 * still has to live under the crest.
 */
const HELD_AMP: Record<ChopLevel, number> = {
  1: 0.005,
  2: 0.03,
  3: 0.072,
  4: 0.108,
  5: 0.142,
};

/** Wind chop amplitude for the held pool surface. `bias` is the pool side of `chopBias`. */
export function heldSurfaceAmp(level: ChopLevel, bias: number, windMph: number | null): number {
  const mph = windMph != null && Number.isFinite(windMph) ? Math.max(0, windMph) : 0;
  const boost = 1 + Math.min(0.48, Math.max(0, mph - 14) / 64);
  const shelter = Number.isFinite(bias) ? Math.max(0, bias) : 1;
  return HELD_AMP[level] * boost * shelter;
}

/** Same two-wave ripple the sea strokes use. `amp` is already in schematic units. */
export function surfaceRipple(u: number, timeS: number, level: ChopLevel, amp: number): number {
  const motion = chopMotion(level, 1);
  const a = Math.sin(u * (3.2 + level * 0.55) + timeS * motion.speed);
  const b = Math.sin(u * (6.8 + level * 0.9) - timeS * motion.speed * 1.33 + 0.6);
  const mix = motion.wobble * 0.28;
  return (amp * (a + mix * b)) / (1 + mix);
}

/**
 * Held-water ripple. Crests are the smaller half so a gale stays under the
 * wall; the troughs carry the roughness.
 */
export function heldRipple(u: number, timeS: number, level: ChopLevel, amp: number): number {
  const raw = surfaceRipple(u, timeS, level, amp);
  return raw > 0 ? raw * 0.42 : raw;
}

/** Ink cap for held water. Crest of the wall is 1. */
export const HELD_SURFACE_CAP = 0.972;

export function heldSurface(still: number, ripple: number): number {
  return Math.min(HELD_SURFACE_CAP, still + ripple);
}

function clampSea(schematic: number): number {
  return Math.min(1.38, Math.max(-0.1, schematic));
}

export function resolveMode(input: SectionInput): PictureMode {
  if (input.mode) return input.mode;
  const sea = input.seaMetresCD;
  const top = input.wallTopMetresCD;
  if (sea == null || !Number.isFinite(sea) || !Number.isFinite(top)) return "pool";
  if (sea >= top) return "sea";
  const half = swellMetres(input.waveHeightM, input.windMph) * 0.5;
  const freeboard = top - sea;
  const close = freeboard < 0.5;
  const reaches = sea + half >= top - 0.02;
  if (!input.falling && close && reaches) return "overflow";
  const peak = input.recentPeakMetresCD;
  const droppedFromCover = peak != null && peak >= top - 0.02;
  if (input.falling && droppedFromCover && freeboard < 1.15) return "falling";
  return "pool";
}

export function resolveSection(input: SectionInput): ResolvedSection {
  const mode = resolveMode(input);
  const bias = chopBias(input.compass);
  const heldAmp = heldSurfaceAmp(input.chopLevel, bias.pool, input.windMph);
  if (input.mode) {
    const canon = CANONICAL[input.mode];
    return {
      mode,
      sea: canon.sea,
      seaDraw: canon.sea,
      waveAmp: canon.amp,
      wavePeriodS: canon.period,
      chopLevel: input.chopLevel,
      poolBias: bias.pool,
      seaBias: bias.sea,
      heldAmp,
    };
  }
  const sea =
    input.seaMetresCD != null && Number.isFinite(input.wallTopMetresCD)
      ? metresToSchematic(input.seaMetresCD, input.wallTopMetresCD)
      : CANONICAL.pool.sea;
  const seaDraw = clampSea(sea);
  const metres = swellMetres(input.waveHeightM, input.windMph);
  let waveAmp = Math.min(0.18, Math.max(0.02, (metres * 0.5) / WALL_HEIGHT_M));
  if (mode === "overflow" && seaDraw + waveAmp < 1.025) {
    waveAmp = Math.min(0.2, Math.max(waveAmp, 1.04 - seaDraw));
  }
  const period = input.wavePeriodS;
  const wavePeriodS = period != null && period >= 3 && period <= 18 ? period : 6.5;
  return {
    mode,
    sea,
    seaDraw,
    waveAmp,
    wavePeriodS,
    chopLevel: input.chopLevel,
    poolBias: bias.pool,
    seaBias: bias.sea,
    heldAmp,
  };
}

/** Signed swell at ratio-position `u`. Crests travel toward the beach. */
export function swellOffset(u: number, timeS: number, amp: number, periodS: number): number {
  const k = 1.15;
  const omega = (Math.PI * 2) / periodS;
  return amp * Math.sin(-k * u - omega * timeS);
}

/** 0 when the swell is off the crest. Only overflow may return a pulse. */
export function overtopStrength(mode: PictureMode, sea: number, amp: number, swell: number): number {
  if (mode !== "overflow") return 0;
  const surface = sea + swell;
  if (surface <= 1) return 0;
  return Math.min(1, (surface - 1) / Math.max(0.025, amp * 0.5));
}

export type FrameLevels = {
  pool: number;
  sheet: number;
  phaseSwell: number;
};

export function frameLevels(section: ResolvedSection, timeS: number): FrameLevels {
  const swell = swellOffset(WALL_FACE_U, timeS, section.waveAmp, section.wavePeriodS);
  const sheet = overtopStrength(section.mode, section.seaDraw, section.waveAmp, swell);
  if (section.mode === "sea") {
    return { pool: section.seaDraw, sheet: 0, phaseSwell: swell };
  }
  if (section.mode !== "overflow") {
    return { pool: HELD_FULL, sheet: 0, phaseSwell: swell };
  }
  const earlier = swellOffset(
    WALL_FACE_U,
    timeS - section.wavePeriodS * 0.12,
    section.waveAmp,
    section.wavePeriodS,
  );
  const lagged = overtopStrength(section.mode, section.seaDraw, section.waveAmp, earlier);
  const rise = Math.max(sheet, lagged * 0.75);
  const pool = Math.min(0.995, 0.95 + 0.045 * rise);
  return { pool, sheet, phaseSwell: swell };
}

export function sectionAlt(mode: PictureMode): string {
  if (mode === "overflow") {
    return "Cross-section. The swell is skimming over the wall into the pool in thin pulses.";
  }
  if (mode === "sea") {
    return "Cross-section. One water surface covers the pool and the sea. The wall is still outlined underneath.";
  }
  if (mode === "falling") {
    return "Cross-section. The sea has dropped below the wall and the pool is still full. Water is not pouring back over the wall.";
  }
  return "Cross-section of the pool. Beach on the left, water held below the wall, sea below the crest.";
}

export function parsePictureMode(value: string | undefined): PictureMode | null {
  if (value === "pool" || value === "overflow" || value === "sea" || value === "falling") return value;
  if (value === "waterfall") return "overflow";
  return null;
}
