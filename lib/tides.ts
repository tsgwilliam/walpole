import { LINKS, TIDE_STATION } from "./constants";
import { loadCached } from "./cache";

export type TidePoint = { t: string; h: number };
export type TideEvent = { t: string; h: number; kind: "high" | "low" };

export type TideBundle = {
  stationId: string;
  stationName: string;
  points: TidePoint[];
  events: TideEvent[];
};

const SIX_HOURS = 6 * 60 * 60 * 1000;

function asUtc(value: string): string {
  if (/[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value).toISOString();
  return new Date(`${value}Z`).toISOString();
}

type Raw = {
  tidalEventList?: { eventType?: number; dateTime?: string; height?: number }[];
  tidalHeightOccurrenceList?: { dateTime?: string; height?: number }[];
};

async function fetchTide(): Promise<TideBundle> {
  const url = `https://easytide.admiralty.co.uk/Home/GetPredictionData?stationId=${TIDE_STATION.id}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "WalpoleBayConditions/0.1 (leisure conditions notebook)",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`EasyTide answered ${response.status}`);
  }
  const raw = (await response.json()) as Raw;
  const points = (raw.tidalHeightOccurrenceList ?? [])
    .filter((p) => p.dateTime && typeof p.height === "number")
    .map((p) => ({ t: asUtc(p.dateTime as string), h: p.height as number }))
    .sort((a, b) => a.t.localeCompare(b.t));
  const events = (raw.tidalEventList ?? [])
    .filter((e) => e.dateTime && typeof e.height === "number" && (e.eventType === 0 || e.eventType === 1))
    .map((e) => ({
      t: asUtc(e.dateTime as string),
      h: e.height as number,
      kind: (e.eventType === 0 ? "high" : "low") as "high" | "low",
    }))
    .sort((a, b) => a.t.localeCompare(b.t));
  if (points.length < 8) throw new Error("EasyTide returned no usable height curve.");
  return {
    stationId: TIDE_STATION.id,
    stationName: TIDE_STATION.name,
    points,
    events,
  };
}

export async function getTide(fresh: boolean) {
  const loaded = await loadCached("tides-margate", SIX_HOURS, fresh, fetchTide);
  return loaded;
}

export const TIDE_SOURCE = {
  name: "UKHO ADMIRALTY EasyTide",
  url: LINKS.easytide,
  about: LINKS.easytideAbout,
  note: "Free leisure predictions for Margate. This is the public EasyTide feed, not the keyed Admiralty Tidal API.",
};
