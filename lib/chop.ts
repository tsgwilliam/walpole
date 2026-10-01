/**
 * Provisional chop pilot for Walpole Bay.
 *
 * The cliff runs along the south of the pool, so southerlies are softened and
 * northerlies are treated as hitting the water. This is not a wave model and
 * not a zone map — five phrases from Open-Meteo wind at the pin.
 *
 * Thresholds (knots), read at call time unless passed in:
 *   CHOP_LIGHT_KT  default 10
 *   CHOP_STRONG_KT default 18
 * Below half of light is bathwater. Up to light is the odd splash. Up to the
 * midpoint of light and strong is spitting. Up to strong, or a strong wind
 * that is not onshore, is face splashin. A strong onshore wind is the wave
 * machine. S, SSE, SSW, SW, and WSW step that result down one.
 */

export const MPH_TO_KT = 0.868976;

export type ChopLevel = 1 | 2 | 3 | 4 | 5;

export const CHOP_LEVELS: { level: ChopLevel; label: string }[] = [
  { level: 1, label: "still as bathwater" },
  { level: 2, label: "the odd splash" },
  { level: 3, label: "you gonna be spitting water" },
  { level: 4, label: "face splashin a plenty" },
  { level: 5, label: "wave machine at Center Parks is on" },
];

/** Sea is to the north. These directions come in off the water. */
const ONSHORE = new Set(["N", "NNE", "NE", "ENE", "NW", "NNW", "WNW"]);

/** Cliff along the south takes some of this. */
const SHELTER = new Set(["S", "SSE", "SSW", "SW", "WSW"]);

export type ChopReading = {
  level: ChopLevel;
  knots: number;
  caption: string;
  /** Working thresholds actually used, so the sheet can stay honest. */
  lightKt: number;
  strongKt: number;
};

function readKt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function chopThresholds(override?: { lightKt?: number; strongKt?: number }): {
  lightKt: number;
  strongKt: number;
} {
  let lightKt = override?.lightKt ?? readKt("CHOP_LIGHT_KT", 10);
  let strongKt = override?.strongKt ?? readKt("CHOP_STRONG_KT", 18);
  if (!(lightKt > 0) || !(strongKt > lightKt)) {
    lightKt = 10;
    strongKt = 18;
  }
  return { lightKt, strongKt };
}

function asLevel(n: number): ChopLevel {
  return Math.min(5, Math.max(1, Math.round(n))) as ChopLevel;
}

export function classifyChop(input: {
  windMph: number;
  compass: string;
  lightKt?: number;
  strongKt?: number;
}): ChopReading {
  const { lightKt, strongKt } = chopThresholds({
    lightKt: input.lightKt,
    strongKt: input.strongKt,
  });
  const knots = Number.isFinite(input.windMph) ? input.windMph * MPH_TO_KT : 0;
  const compass = (input.compass || "").toUpperCase();
  const midKt = (lightKt + strongKt) / 2;

  let level: ChopLevel;
  if (knots < lightKt * 0.5) level = 1;
  else if (knots < lightKt) level = 2;
  else if (knots < midKt) level = 3;
  else if (knots < strongKt) level = 4;
  else if (ONSHORE.has(compass)) level = 5;
  else level = 4;

  if (SHELTER.has(compass)) level = asLevel(level - 1);

  let caption: string;
  if (!compass) caption = "wind quiet";
  else if (ONSHORE.has(compass)) caption = `${compass} wind · cliff less help`;
  else if (SHELTER.has(compass)) caption = `${compass} wind · cliff takes some`;
  else caption = `${compass} wind`;

  return { level, knots, caption, lightKt, strongKt };
}

export function chopLabel(level: ChopLevel): string {
  return CHOP_LEVELS[level - 1].label;
}

/**
 * Cliff along the south. Same direction sets as the chop pilot.
 * Cross-shore directions are left unknown rather than given a made-up shelter.
 */
export function cliffTemperLine(compass: string | null | undefined): string {
  const c = (compass || "").toUpperCase();
  if (!c) return "Cliff tempering unknown.";
  if (SHELTER.has(c)) {
    return "Southerly — the cliff usually takes some of this. A direction guess, not a measurement.";
  }
  if (ONSHORE.has(c)) {
    return "Off the sea — the cliff is little help. A direction guess, not a measurement.";
  }
  return "Cliff tempering unknown for this direction.";
}
