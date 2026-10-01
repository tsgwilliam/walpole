import type { WallStateId } from "./wall-state";

/** What the glance says. The wall enum stays underneath. */
export type GlanceMode = "pool" | "waterfall" | "sea";

export function glanceMode(state: WallStateId): GlanceMode {
  if (state === "covered") return "sea";
  if (state === "waterfall") return "waterfall";
  return "pool";
}

export const MODE_HEADLINE: Record<GlanceMode, string> = {
  pool: "Pool mode activated",
  sea: "Sea mode activated",
  waterfall: "Magic waterfall activated",
};

const MODE_NAME: Record<GlanceMode, string> = {
  pool: "Pool mode",
  sea: "Sea mode",
  waterfall: "Magic waterfall",
};

/**
 * When today's curve next leaves the current mode.
 * Exposed and near-the-top are both pool mode, so a change between them
 * does not end the mode.
 */
export function modeEndAt(
  state: WallStateId,
  changes: { at: string; state: WallStateId }[],
  nowIso: string,
): string | null {
  const mode = glanceMode(state);
  const now = Date.parse(nowIso);
  const next = changes.find(
    (change) => Date.parse(change.at) > now + 30_000 && glanceMode(change.state) !== mode,
  );
  return next?.at ?? null;
}

/** No mode change inside the forward window the slider can see. */
export function modeUnbrokenLine(mode: GlanceMode, reach: "day" | "curve"): string {
  const name = MODE_NAME[mode];
  if (reach === "day") return `${name} still on through the next 24 hours`;
  return `${name} still on as far as this curve goes`;
}

export function modeRemainingLine(mode: GlanceMode, endIso: string | null, nowIso: string): string {
  const name = MODE_NAME[mode];
  if (!endIso) return `${name} active for the rest of today`;
  const mins = Math.round((Date.parse(endIso) - Date.parse(nowIso)) / 60_000);
  if (!Number.isFinite(mins) || mins <= 1) return `${name} ending now`;
  if (mins < 60) {
    return `${name} active for another ${mins} ${mins === 1 ? "minute" : "minutes"}`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  const hourWord = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  if (rem < 8) return `${name} active for another ${hourWord}`;
  return `${name} active for another ${hourWord} ${rem} minutes`;
}
