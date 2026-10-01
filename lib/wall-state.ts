export type WallStateId = "exposed" | "near_top" | "waterfall" | "covered";

export type WallSettings = {
  wallTopMetresCD: number;
  overflowMetresCD: number;
  approachBandMetres: number;
  waterfallWindowMinutes: number;
  waveAllowanceMetres: number;
};

export type HeightSample = {
  /** Epoch milliseconds. */
  t: number;
  /** Metres above Chart Datum, before wave allowance. */
  h: number;
};

export const STATE_LABEL: Record<WallStateId, string> = {
  exposed: "Walls exposed",
  near_top: "Water near top",
  waterfall: "Magic waterfall time",
  covered: "Walls covered",
};

export const STATE_DETAIL: Record<WallStateId, string> = {
  exposed: "Pool-as-pool. The tide is below the wall.",
  near_top: "Water near the top, or over the lip outside the short waterfall window.",
  waterfall: "The short stretch when a rising tide comes over the wall.",
  covered: "Walls submerged. The sea has the pool.",
};

export function settingsAreUsable(settings: WallSettings): string | null {
  if (!Number.isFinite(settings.wallTopMetresCD) || !Number.isFinite(settings.overflowMetresCD)) {
    return "The wall numbers are not usable, so the reading is withheld.";
  }
  if (!(settings.overflowMetresCD < settings.wallTopMetresCD)) {
    return "Overflow height has to sit below the wall top. The reading is withheld until the keeper fixes the numbers.";
  }
  if (!(settings.approachBandMetres >= 0) || !(settings.waterfallWindowMinutes > 0)) {
    return "The approach band or waterfall window is not usable. The reading is withheld.";
  }
  if (!(settings.waveAllowanceMetres >= 0)) {
    return "Wave allowance cannot be negative. The reading is withheld.";
  }
  return null;
}

export function interpolateHeight(samples: HeightSample[], t: number): number | null {
  if (samples.length === 0) return null;
  if (t < samples[0].t || t > samples[samples.length - 1].t) return null;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  if (b.t === a.t) return a.h;
  const u = (t - a.t) / (b.t - a.t);
  return a.h + (b.h - a.h) * u;
}

export function risingCrossings(samples: HeightSample[], level: number): number[] {
  const times: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.h < level && b.h >= level && b.h !== a.h) {
      const u = (level - a.h) / (b.h - a.h);
      times.push(a.t + u * (b.t - a.t));
    }
  }
  return times;
}

export function classifyInstant(
  heightCd: number,
  t: number,
  overflowCrossings: number[],
  settings: WallSettings,
): WallStateId {
  const height = heightCd + settings.waveAllowanceMetres;
  if (height >= settings.wallTopMetresCD) return "covered";
  const windowMs = settings.waterfallWindowMinutes * 60 * 1000;
  const inWindow = overflowCrossings.some((c) => t >= c && t < c + windowMs);
  if (
    inWindow &&
    height >= settings.overflowMetresCD - 0.03 &&
    height < settings.wallTopMetresCD
  ) {
    return "waterfall";
  }
  if (height >= settings.overflowMetresCD - settings.approachBandMetres) return "near_top";
  return "exposed";
}

export type StateChange = { t: number; state: WallStateId };

export type WallReading = {
  state: WallStateId;
  label: string;
  blurb: string;
  heightMetres: number;
  changes: StateChange[];
  waterfallWindows: { start: number; end: number }[];
  nextChange: StateChange | null;
};

function effectiveSeries(samples: HeightSample[], wave: number): HeightSample[] {
  if (wave === 0) return samples;
  return samples.map((s) => ({ t: s.t, h: s.h + wave }));
}

export function describeState(
  state: WallStateId,
  height: number,
  previous: number | null,
  settings: WallSettings,
): string {
  const rising = previous != null && height - previous > 0.02;
  const falling = previous != null && previous - height > 0.02;
  const overLip = height >= settings.overflowMetresCD && height < settings.wallTopMetresCD;

  if (state === "exposed") {
    return falling
      ? "Walls exposed again. The pool is being a pool."
      : "Walls exposed. The pool is being a pool.";
  }
  if (state === "waterfall") {
    return "Magic waterfall time. The tide is coming over the wall — this window is about a quarter of an hour.";
  }
  if (state === "covered") {
    return falling
      ? "Walls still covered, and the tide is on its way down."
      : "Walls covered. The sea has the pool for now.";
  }
  if (overLip && rising) return "Still spilling, past the short waterfall window. The top of the wall is showing.";
  if (overLip && falling) return "The tide is dropping, still over the lip.";
  if (overLip) return "Over the lip, outside the short waterfall window.";
  if (rising) return "Water is near the top, sidling up to the overflow.";
  if (falling) return "The tide is dropping back from the overflow.";
  return "Water is near the top of the wall.";
}

/**
 * Provisional wall state for one civil day.
 * `samples` are predicted tide heights in metres Chart Datum.
 * Crossings use tide plus the wave-allowance stub.
 */
export function buildWallReading(
  samples: HeightSample[],
  settings: WallSettings,
  now: number,
  dayStart: number,
  dayEnd: number,
): WallReading | null {
  if (settingsAreUsable(settings)) return null;
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const tideNow = interpolateHeight(ordered, now);
  if (tideNow == null) return null;

  const effective = effectiveSeries(ordered, settings.waveAllowanceMetres);
  const crossings = risingCrossings(effective, settings.overflowMetresCD);
  const state = classifyInstant(tideNow, now, crossings, settings);
  const prev = interpolateHeight(ordered, now - 20 * 60 * 1000);
  const heightMetres = tideNow + settings.waveAllowanceMetres;

  const from = Math.max(dayStart, ordered[0]?.t ?? dayStart);
  const to = Math.min(dayEnd, ordered[ordered.length - 1]?.t ?? dayEnd);
  const changes = listStateChanges(ordered, crossings, settings, from, to);

  const waterfallWindows = crossings
    .map((start) => ({
      start,
      end: start + settings.waterfallWindowMinutes * 60 * 1000,
    }))
    .filter((w) => w.end > dayStart && w.start < dayEnd)
    .map((w) => ({
      start: Math.max(w.start, dayStart),
      end: Math.min(w.end, dayEnd),
    }));

  const nextChange = changes.find((c) => c.t > now + 30 * 1000) ?? null;

  return {
    state,
    label: STATE_LABEL[state],
    blurb: describeState(state, heightMetres, prev == null ? null : prev + settings.waveAllowanceMetres, settings),
    heightMetres,
    changes,
    waterfallWindows,
    nextChange,
  };
}

export function tideCrossings(
  samples: HeightSample[],
  settings: WallSettings,
): { ordered: HeightSample[]; crossings: number[] } | null {
  if (settingsAreUsable(settings)) return null;
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  return {
    ordered,
    crossings: risingCrossings(effectiveSeries(ordered, settings.waveAllowanceMetres), settings.overflowMetresCD),
  };
}

/** State changes on a one-minute step. `ordered` is sorted by time. */
export function listStateChanges(
  ordered: HeightSample[],
  crossings: number[],
  settings: WallSettings,
  from: number,
  to: number,
): StateChange[] {
  const step = 60 * 1000;
  const changes: StateChange[] = [];
  let previousState: WallStateId | null = null;
  for (let t = from; t < to; t += step) {
    const h = interpolateHeight(ordered, t);
    if (h == null) continue;
    const s = classifyInstant(h, t, crossings, settings);
    if (s !== previousState) {
      changes.push({ t, state: s });
      previousState = s;
    }
  }
  return changes;
}

export function readingAt(
  ordered: HeightSample[],
  crossings: number[],
  settings: WallSettings,
  t: number,
): { state: WallStateId; heightMetres: number } | null {
  const tide = interpolateHeight(ordered, t);
  if (tide == null) return null;
  return {
    state: classifyInstant(tide, t, crossings, settings),
    heightMetres: tide + settings.waveAllowanceMetres,
  };
}
