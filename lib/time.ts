export type LondonParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

const dtf = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function londonParts(instant: Date): LondonParts {
  const bag: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    bag[part.type] = part.value;
  }
  let hour = bag.hour ?? "00";
  if (hour === "24") hour = "00";
  return {
    year: bag.year ?? "1970",
    month: bag.month ?? "01",
    day: bag.day ?? "01",
    hour,
    minute: bag.minute ?? "00",
    second: bag.second ?? "00",
  };
}

/** Milliseconds to add to a UTC instant to read it as a London civil clock. */
export function londonOffsetMs(instant: Date): number {
  const p = londonParts(instant);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - instant.getTime();
}

export function londonDayKey(instant: Date): string {
  const p = londonParts(instant);
  return `${p.year}-${p.month}-${p.day}`;
}

export function londonDayBounds(instant: Date): {
  start: Date;
  end: Date;
  key: string;
} {
  const key = londonDayKey(instant);
  const [ys, ms, ds] = key.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const probe = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const start = new Date(probe.getTime() - londonOffsetMs(probe));
  const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const end = new Date(next.getTime() - londonOffsetMs(next));
  return { start, end, key };
}

export function formatLondonTime(instant: Date): string {
  const p = londonParts(instant);
  return `${p.hour}:${p.minute}`;
}

/** Clock label for the glance slider. `atMs === nowMs` is the live sheet. */
export function scrubTimeLabel(atMs: number, nowMs: number): string {
  const at = new Date(atMs);
  const now = new Date(nowMs);
  const clock = formatLondonTime(at);
  if (atMs === nowMs) return `Now · ${clock}`;
  const atKey = londonDayKey(at);
  if (atKey === londonDayKey(now)) return `Today · ${clock}`;
  const tomorrowKey = londonDayKey(new Date(londonDayBounds(now).end.getTime() + 60_000));
  if (atKey === tomorrowKey) return `Tomorrow · ${clock}`;
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
  }).format(at);
  return `${weekday} · ${clock}`;
}

export function formatLondonDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instant);
}

export function formatLondonStamp(instant: Date): string {
  return `${formatLondonDate(instant)} · ${formatLondonTime(instant)}`;
}

/** Minutes since London midnight, for charting one civil day. */
export function londonMinutes(instant: Date): number {
  const p = londonParts(instant);
  return Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60;
}

/**
 * Parse a Europe/London civil time that has no offset, the shape Open-Meteo
 * returns when `timezone=Europe/London` (`2026-09-27T16:00`).
 */
export function parseLondonCivil(stamp: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(stamp);
  if (!match) return Date.parse(stamp);
  const asUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    match[6] ? Number(match[6]) : 0,
  );
  let utc = asUtc - londonOffsetMs(new Date(asUtc));
  utc = asUtc - londonOffsetMs(new Date(utc));
  return utc;
}
