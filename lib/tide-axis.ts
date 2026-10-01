import { londonMinutes } from "./time";

/** Scrubbed instant sits at this share of the plot width (London day, midnight–midnight). */
export const TIDE_NOW_FRAC = 0.2;

/** Map London civil minutes to 0–1 along the day axis, with `nowMin` at {@link TIDE_NOW_FRAC}. */
export function tideDayFraction(minutes: number, nowMin: number): number {
  const m = Math.max(0, Math.min(1440, minutes));
  const now = Math.max(0, Math.min(1440, nowMin));
  if (m <= now) {
    if (now < 1) return TIDE_NOW_FRAC;
    return (m / now) * TIDE_NOW_FRAC;
  }
  const after = 1440 - now;
  if (after < 1) return TIDE_NOW_FRAC;
  return TIDE_NOW_FRAC + ((m - now) / after) * (1 - TIDE_NOW_FRAC);
}

export function tidePlotX(iso: string, nowIso: string, padL: number, innerW: number): number {
  const nowMin = londonMinutes(new Date(nowIso));
  const min = londonMinutes(new Date(iso));
  return padL + tideDayFraction(min, nowMin) * innerW;
}

export function formatTideClock(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}
