export type WaterGlanceStatus = "clear" | "recent" | "active" | "unknown" | "unavailable";

const londonDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function londonDayKey(instant: Date): string {
  const bag: Record<string, string> = {};
  for (const part of londonDay.formatToParts(instant)) bag[part.type] = part.value;
  return `${bag.year}-${bag.month}-${bag.day}`;
}

/** Whole London civil days from `earlierIso` to `laterIso`. */
export function londonDaySpan(earlierIso: string, laterIso: string): number {
  const earlier = londonDayKey(new Date(earlierIso)).split("-").map(Number);
  const later = londonDayKey(new Date(laterIso)).split("-").map(Number);
  const a = Date.UTC(earlier[0], earlier[1] - 1, earlier[2]);
  const b = Date.UTC(later[0], later[1] - 1, later[2]);
  return Math.round((b - a) / 86_400_000);
}

function releaseLine(days: number | null, quiet: boolean): string {
  if (days == null || days < 0) return "Last release date unknown";
  if (!quiet || days === 0) {
    if (days === 0) return "Last release was today";
    if (days === 1) return "Last release was 1 day ago";
    return `Last release was ${days} days ago`;
  }
  if (days === 1) return "No releases for 1 day";
  return `No releases for ${days} days`;
}

/**
 * Glance water-quality lines. A day count is only printed when the feed
 * actually has a last genuine release time. A clear 72-hour flag is not a date.
 */
export function waterGlanceLines(input: {
  status: WaterGlanceStatus;
  warning: boolean;
  forced: boolean;
  suppressed: boolean;
  lastReleaseEnd: string | null;
  nowIso: string;
}): { lines: [string, string]; warn: boolean } {
  let lead: string;
  if (input.status === "unavailable") lead = "Warnings unknown";
  else if (input.forced) lead = "Keeper warning on";
  else if (input.suppressed) lead = "Warning hidden";
  else if (input.warning && input.status === "active") lead = "Release in the last day";
  else if (input.warning && input.status === "recent") lead = "Release in the last 3 days";
  else if (input.warning) lead = "Warning on";
  else if (input.status === "unknown") lead = "Warnings unknown";
  else lead = "No current warnings";

  const quiet = lead === "No current warnings";
  const days =
    input.lastReleaseEnd && !Number.isNaN(new Date(input.lastReleaseEnd).getTime())
      ? londonDaySpan(input.lastReleaseEnd, input.nowIso)
      : null;

  return {
    lines: [lead, releaseLine(days, quiet)],
    warn: input.warning || input.forced || input.status === "active" || input.status === "recent",
  };
}
