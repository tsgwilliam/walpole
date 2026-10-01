import { WORKING_WALL } from "./geography";

export const POOL = {
  name: "Walpole Bay Tidal Pool",
  place: "Margate, Kent",
  latitude: 51.39292,
  longitude: 1.40422,
  area: "CT9",
} as const;

export const TIDE_STATION = {
  id: "0103",
  name: "Margate",
  latitude: 51.383333,
  longitude: 1.383333,
  /** Great-circle distance from the pool pin to the EasyTide station. */
  distanceKm: 1.8,
} as const;

export const BATHING = {
  name: "Walpole Bay, Margate",
  eubwid: "ukj4210-12630",
  profileUrl:
    "https://environment.data.gov.uk/bwq/profiles/profile.html?site=ukj4210-12630",
} as const;

export const LINKS = {
  easytide: "https://easytide.admiralty.co.uk/",
  easytideAbout: "https://www.admiralty.co.uk/access-data/tidal-data/easy-tide",
  admiraltyApi: "https://www.admiralty.co.uk/access-data/apis",
  openMeteo: "https://open-meteo.com/",
  swimfo: BATHING.profileUrl,
  riversAndSeas: "https://riversandseaswatch.southernwater.co.uk/",
  southernWaterNote:
    "https://www.southernwater.co.uk/our-region/clean-rivers-and-seas-task-force/rivers-and-seas-watch/",
  sas: "https://www.sas.org.uk/water-quality/sewage-pollution-alerts/safer-seas-rivers-service/",
  sasMap: "https://datahq.sas.org.uk/sewage-data-hq/",
  listing: "https://heritage.kent.gov.uk/Designation/DKE22446/",
} as const;

/**
 * Seeded wall heights, metres above Chart Datum.
 * Historic England (Kent HER DKE22446): the seaward wall is about seven feet
 * above the chalk, with overflows six inches below the top. That relative
 * pair is kept: overflow sits 0.15 m under the crest, and the waterfall
 * window is still about fifteen minutes. The crest itself is the working
 * 3.5 m from the 2020 elevation notes (±0.2 m), not the old 4.00 m placeholder.
 * See GEOGRAPHY.md.
 */
export const DEFAULT_WALL = {
  wallTopMetresCD: WORKING_WALL.crestMetresCD,
  overflowMetresCD: WORKING_WALL.overflowMetresCD,
  approachBandMetres: 0.35,
  waterfallWindowMinutes: 15,
  waveAllowanceMetres: 0,
} as const;

export const APP_NAME = "Walpole Bay Conditions";
