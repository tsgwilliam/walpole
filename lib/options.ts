export const WALL_OPTIONS = [
  { value: "exposed", label: "Walls fully exposed", hint: "Pool-as-pool. You can see the wall standing clear." },
  { value: "near_top", label: "Water near the top", hint: "Close to the overflow, or spilling but not the short waterfall." },
  { value: "waterfall", label: "Overspilling — waterfall", hint: "The tide is coming over the wall." },
  { value: "covered", label: "Walls covered", hint: "The sea has gone over. Walls submerged." },
] as const;

export const WHEN_OPTIONS = [
  { value: "just_now", label: "Just now" },
  { value: "last_15_30", label: "In the last 15–30 minutes" },
  { value: "earlier_today", label: "Earlier today" },
] as const;

export const WHERE_OPTIONS = [
  { value: "landward", label: "Landward end", hint: "The open beach side, no wall." },
  { value: "middle", label: "Middle of the pool" },
  { value: "seaward", label: "Seaward wall", hint: "The outer wall, where it overflows." },
] as const;

export const FEEL_OPTIONS = [
  { value: "inviting", label: "Glassy and inviting" },
  { value: "choppy", label: "Choppy, but swimmable" },
  { value: "rough", label: "Rough — think twice" },
  { value: "unpleasant", label: "Murky or unpleasant" },
  { value: "stayed_out", label: "Too wild, stayed out" },
] as const;

export const TEMP_OPTIONS = [
  { value: "biting", label: "Biting" },
  { value: "cold", label: "Cold" },
  { value: "fresh", label: "Fresh" },
  { value: "mild", label: "Mild" },
  { value: "warm", label: "Warm, for here" },
] as const;

export const WIND_OPTIONS = [
  { value: "still", label: "Still" },
  { value: "breeze", label: "A breeze" },
  { value: "windy", label: "Windy" },
  { value: "hard", label: "Hard to stand in" },
] as const;

export const CLARITY_OPTIONS = [
  { value: "clear", label: "Clear to the floor" },
  { value: "cloudy", label: "A bit cloudy" },
  { value: "murky", label: "Murky" },
  { value: "unknown", label: "Could not tell" },
] as const;

export const CROWD_OPTIONS = [
  { value: "empty", label: "Empty" },
  { value: "few", label: "A few people" },
  { value: "busy", label: "Busy" },
  { value: "packed", label: "Packed" },
] as const;

export const WILDLIFE_OPTIONS = [
  { value: "none", label: "Nothing noted" },
  { value: "birds", label: "Birds" },
  { value: "fish", label: "Fish" },
  { value: "jellyfish", label: "Jellyfish" },
  { value: "other", label: "Other marine life" },
] as const;

export const SWIM_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "Not today" },
] as const;

type Option = { value: string; label: string };

export function labelOf(options: readonly Option[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

export const REQUIRED_FIELDS = ["wall_state", "when_seen", "where_pool", "conditions_feel"] as const;

const ALLOWED: Record<string, readonly string[]> = {
  wall_state: WALL_OPTIONS.map((o) => o.value),
  when_seen: WHEN_OPTIONS.map((o) => o.value),
  where_pool: WHERE_OPTIONS.map((o) => o.value),
  conditions_feel: FEEL_OPTIONS.map((o) => o.value),
  water_temp_feel: TEMP_OPTIONS.map((o) => o.value),
  wind_feel: WIND_OPTIONS.map((o) => o.value),
  clarity: CLARITY_OPTIONS.map((o) => o.value),
  crowd: CROWD_OPTIONS.map((o) => o.value),
  wildlife: WILDLIFE_OPTIONS.map((o) => o.value),
  swim_again: SWIM_OPTIONS.map((o) => o.value),
};

export type ObservationInput = {
  wall_state: string;
  when_seen: string;
  where_pool: string;
  conditions_feel: string;
  water_temp_feel: string | null;
  wind_feel: string | null;
  clarity: string | null;
  crowd: string | null;
  wildlife: string | null;
  swim_again: string | null;
};

export function parseObservation(body: unknown): { ok: true; value: ObservationInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "That note did not arrive in one piece." };
  }
  const raw = body as Record<string, unknown>;
  const pick = (key: string, required: boolean): string | null | undefined => {
    const v = raw[key];
    if (v == null || v === "") return required ? undefined : null;
    if (typeof v !== "string") return undefined;
    if (!ALLOWED[key].includes(v)) return undefined;
    return v;
  };

  const wall_state = pick("wall_state", true);
  const when_seen = pick("when_seen", true);
  const where_pool = pick("where_pool", true);
  const conditions_feel = pick("conditions_feel", true);
  if (!wall_state || !when_seen || !where_pool || !conditions_feel) {
    return {
      ok: false,
      error: "Choose a wall state, when you saw it, where you were, and how it felt. Those four are the calibration set.",
    };
  }

  const optional = (key: string) => {
    const v = pick(key, false);
    if (v === undefined) return { bad: true as const };
    return { bad: false as const, v };
  };
  const extras = ["water_temp_feel", "wind_feel", "clarity", "crowd", "wildlife", "swim_again"] as const;
  const bag: Record<string, string | null> = {};
  for (const key of extras) {
    const got = optional(key);
    if (got.bad) return { ok: false, error: "One of the optional answers was not on the list." };
    bag[key] = got.v;
  }

  return {
    ok: true,
    value: {
      wall_state,
      when_seen,
      where_pool,
      conditions_feel,
      water_temp_feel: bag.water_temp_feel,
      wind_feel: bag.wind_feel,
      clarity: bag.clarity,
      crowd: bag.crowd,
      wildlife: bag.wildlife,
      swim_again: bag.swim_again,
    },
  };
}
