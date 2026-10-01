const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const COMPASS_WORD = [
  "north",
  "north-northeast",
  "northeast",
  "east-northeast",
  "east",
  "east-southeast",
  "southeast",
  "south-southeast",
  "south",
  "south-southwest",
  "southwest",
  "west-southwest",
  "west",
  "west-northwest",
  "northwest",
  "north-northwest",
];

export function compassFromDegrees(deg: number): { short: string; word: string } {
  const i = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return { short: COMPASS[i], word: COMPASS_WORD[i] };
}

/** Degrees clockwise from north, the way the wind is travelling. */
export function downwindDegrees(fromDeg: number): number {
  return (((fromDeg + 180) % 360) + 360) % 360;
}
