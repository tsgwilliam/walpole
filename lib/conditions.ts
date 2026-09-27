import { approvedObservations, readSettings, type ObservationRow } from "./db";
import { getTide, TIDE_SOURCE, type TideBundle } from "./tides";
import { getWeather, WEATHER_SOURCE, type WeatherBundle } from "./weather";
import { getEaQuality, getSewage, WATER_LINKS, type QualityBundle, type SewageBundle } from "./water";
import { buildWallReading, settingsAreUsable, STATE_LABEL, type WallReading, type WallStateId } from "./wall-state";
import { BATHING, LINKS, POOL, TIDE_STATION } from "./constants";
import { londonDayBounds, londonDayKey } from "./time";
import type { PollutionOverride } from "./db";

export type PublicNote = {
  id: number;
  createdAt: string;
  wallState: string;
  whenSeen: string;
  wherePool: string;
  conditionsFeel: string;
  waterTempFeel: string | null;
  windFeel: string | null;
  clarity: string | null;
  crowd: string | null;
  wildlife: string | null;
  swimAgain: string | null;
  isSeed: boolean;
};

export type ConditionsSheet = {
  generatedAt: string;
  place: typeof POOL;
  station: typeof TIDE_STATION;
  disclaimer: string;
  settings: ReturnType<typeof readSettings>;
  settingsProblem: string | null;
  wall: null | {
    state: WallStateId;
    label: string;
    blurb: string;
    heightMetres: number;
    changes: { at: string; state: WallStateId; label: string }[];
    waterfallWindows: { start: string; end: string }[];
    nextChange: { at: string; state: WallStateId; label: string } | null;
  };
  tide: null | {
    fetchedAt: string;
    stale: boolean;
    sourceName: string;
    sourceUrl: string;
    points: { t: string; h: number }[];
    events: TideBundle["events"];
    dayKey: string;
  };
  tideError: string | null;
  weather: null | (WeatherBundle & { fetchedAt: string; stale: boolean });
  weatherError: string | null;
  quality: {
    classification: string | null;
    year: number | null;
    source: QualityBundle["source"];
    note: string;
    profileUrl: string;
    fetchedAt: string | null;
    stale: boolean;
  };
  sewage: {
    company: "Southern Water";
    status: SewageBundle["status"] | "unavailable";
    message: string | null;
    warning: boolean;
    suppressed: boolean;
    forced: boolean;
    updatedAt: string | null;
    lastReleaseEnd: string | null;
    fetchedAt: string | null;
    stale: boolean;
    error: string | null;
    links: { label: string; href: string }[];
  };
  observations: PublicNote[];
  sources: { name: string; detail: string; href: string }[];
};

function toNote(row: ObservationRow): PublicNote {
  return {
    id: row.id,
    createdAt: row.created_at,
    wallState: row.wall_state,
    whenSeen: row.when_seen,
    wherePool: row.where_pool,
    conditionsFeel: row.conditions_feel,
    waterTempFeel: row.water_temp_feel,
    windFeel: row.wind_feel,
    clarity: row.clarity,
    crowd: row.crowd,
    wildlife: row.wildlife,
    swimAgain: row.swim_again,
    isSeed: row.is_seed === 1,
  };
}

function readingPayload(reading: WallReading) {
  return {
    state: reading.state,
    label: reading.label,
    blurb: reading.blurb,
    heightMetres: reading.heightMetres,
    changes: reading.changes.map((c) => ({
      at: new Date(c.t).toISOString(),
      state: c.state,
      label: STATE_LABEL[c.state],
    })),
    waterfallWindows: reading.waterfallWindows.map((w) => ({
      start: new Date(w.start).toISOString(),
      end: new Date(w.end).toISOString(),
    })),
    nextChange: reading.nextChange
      ? {
          at: new Date(reading.nextChange.t).toISOString(),
          state: reading.nextChange.state,
          label: STATE_LABEL[reading.nextChange.state],
        }
      : null,
  };
}

function qualityFrom(
  ea: { data: QualityBundle; fetchedAt: string; stale: boolean } | null,
  sewage: SewageBundle | null,
): ConditionsSheet["quality"] {
  if (ea) {
    return {
      classification: ea.data.classification,
      year: ea.data.year,
      source: "environment-agency",
      note: ea.data.note,
      profileUrl: LINKS.swimfo,
      fetchedAt: ea.fetchedAt,
      stale: ea.stale,
    };
  }
  if (sewage?.classification) {
    return {
      classification: sewage.classification,
      year: sewage.classificationYear,
      source: "southern-water-rsw",
      note: `Annual class ${sewage.classification}${sewage.classificationYear ? ` (${sewage.classificationYear})` : ""} is the figure Southern Water publishes for ${BATHING.name} (${BATHING.eubwid}). The Environment Agency profile feed did not answer from here, so confirm it on Swimfo. It is last season's class, not a sample from this morning.`,
      profileUrl: LINKS.swimfo,
      fetchedAt: null,
      stale: false,
    };
  }
  return {
    classification: null,
    year: null,
    source: "none",
    note: "Bathing-water class could not be loaded. The Environment Agency feed did not answer, and Southern Water did not supply a class either. Open the Swimfo profile rather than guessing.",
    profileUrl: LINKS.swimfo,
    fetchedAt: null,
    stale: false,
  };
}

function sewagePayload(
  loaded: { data: SewageBundle; fetchedAt: string; stale: boolean } | null,
  override: PollutionOverride,
): ConditionsSheet["sewage"] {
  const base = {
    company: "Southern Water" as const,
    links: WATER_LINKS,
  };
  if (!loaded) {
    return {
      ...base,
      status: "unavailable",
      message: null,
      warning: override === "force_warning",
      suppressed: false,
      forced: override === "force_warning",
      updatedAt: null,
      lastReleaseEnd: null,
      fetchedAt: null,
      stale: false,
      error:
        "Southern Water's Rivers and Seas Watch layer did not answer. There is no public Surfers Against Sewage feed to fall back on. Check the links before you swim.",
    };
  }
  const autoWarning = loaded.data.status === "recent" || loaded.data.status === "active";
  const suppressed = override === "suppress_warning" && autoWarning;
  const forced = override === "force_warning" && !autoWarning;
  const warning = override === "force_warning" ? true : override === "suppress_warning" ? false : autoWarning;
  return {
    ...base,
    status: loaded.data.status,
    message: loaded.data.message,
    warning,
    suppressed,
    forced,
    updatedAt: loaded.data.updatedAt,
    lastReleaseEnd: loaded.data.lastReleaseEnd ?? null,
    fetchedAt: loaded.fetchedAt,
    stale: loaded.stale,
    error: null,
  };
}

export async function getConditions(options: { fresh?: boolean } = {}): Promise<ConditionsSheet> {
  const fresh = options.fresh === true;
  const settings = readSettings();
  const [tideLoaded, weatherLoaded, eaLoaded, sewageLoaded] = await Promise.all([
    getTide(fresh),
    getWeather(fresh),
    getEaQuality(fresh),
    getSewage(fresh),
  ]);

  const now = new Date();
  const bounds = londonDayBounds(now);
  let wall: ConditionsSheet["wall"] = null;
  let tide: ConditionsSheet["tide"] = null;
  let tideError: string | null = null;

  if (!tideLoaded) {
    tideError =
      "Margate predictions did not load, so the wall reading is left blank. A missing number is better than a made-up one.";
  } else {
    const dayPoints = tideLoaded.data.points.filter((p) => londonDayKey(new Date(p.t)) === bounds.key);
    const dayEvents = tideLoaded.data.events.filter((e) => londonDayKey(new Date(e.t)) === bounds.key);
    tide = {
      fetchedAt: tideLoaded.fetchedAt,
      stale: tideLoaded.stale,
      sourceName: TIDE_SOURCE.name,
      sourceUrl: TIDE_SOURCE.url,
      points: dayPoints,
      events: dayEvents,
      dayKey: bounds.key,
    };
    const problem = settingsAreUsable(settings);
    if (!problem) {
      const samples = tideLoaded.data.points.map((p) => ({ t: new Date(p.t).getTime(), h: p.h }));
      const reading = buildWallReading(
        samples,
        settings,
        now.getTime(),
        bounds.start.getTime(),
        bounds.end.getTime(),
      );
      wall = reading ? readingPayload(reading) : null;
      if (!wall) {
        tideError = "The tide curve does not cover this minute, so the wall reading is withheld.";
      }
    }
  }

  const quality = qualityFrom(eaLoaded, sewageLoaded?.data ?? null);
  const sewage = sewagePayload(sewageLoaded, settings.pollutionOverride);

  return {
    generatedAt: now.toISOString(),
    place: POOL,
    station: TIDE_STATION,
    disclaimer:
      "Swim at your own risk. This is a provisional notebook, not a lifeguard, a survey, or an official forecast. The wall reading compares a Margate tide prediction with uncalibrated heights above Chart Datum. Calibration comes from approved notes over time. Check the sources, then decide for yourself.",
    settings,
    settingsProblem: settingsAreUsable(settings),
    wall,
    tide,
    tideError,
    weather: weatherLoaded
      ? { ...weatherLoaded.data, fetchedAt: weatherLoaded.fetchedAt, stale: weatherLoaded.stale }
      : null,
    weatherError: weatherLoaded
      ? null
      : "Weather at the pool pin did not load. Open-Meteo did not answer, and there is no cached copy.",
    quality,
    sewage,
    observations: approvedObservations(8).map(toNote),
    sources: [
      {
        name: TIDE_SOURCE.name,
        detail: tide?.stale
          ? `Margate ${TIDE_STATION.id}, cached copy from ${tide.fetchedAt}`
          : `Margate station ${TIDE_STATION.id}, about ${TIDE_STATION.distanceKm} km from the pool`,
        href: LINKS.easytide,
      },
      {
        name: WEATHER_SOURCE.name,
        detail: WEATHER_SOURCE.note,
        href: LINKS.openMeteo,
      },
      {
        name: quality.source === "environment-agency" ? "Environment Agency" : "Bathing water class",
        detail: quality.note,
        href: LINKS.swimfo,
      },
      {
        name: "Southern Water",
        detail:
          "Wastewater company for Thanet. Near-real-time storm overflow status from the public Rivers and Seas Watch layer. Surfers Against Sewage has no public API here — link out only.",
        href: LINKS.riversAndSeas,
      },
    ],
  };
}

/** Snapshot stored with a new observation so the dataset can compare forecast and note. */
export async function predictionSnapshot(): Promise<{
  predicted_height_m: number | null;
  predicted_state: string | null;
  model_wall_top_m: number;
  model_overflow_m: number;
}> {
  const settings = readSettings();
  const sheet = await getConditions();
  return {
    predicted_height_m: sheet.wall ? Number(sheet.wall.heightMetres.toFixed(3)) : null,
    predicted_state: sheet.wall?.state ?? null,
    model_wall_top_m: settings.wallTopMetresCD,
    model_overflow_m: settings.overflowMetresCD,
  };
}
