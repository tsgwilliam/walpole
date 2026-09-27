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
 * Seeded guesses, metres above Chart Datum.
 * Historic England (Kent HER DKE22446): the seaward wall is about seven feet
 * above the chalk, with overflows six inches below the top. That is relative
 * to the pool floor, not Chart Datum. The listing also says the wall top was
 * set so the pool is submerged at every tide. 4.00 / 3.85 is a round
 * placeholder below a spring high water at Margate, not a survey.
 */
export const DEFAULT_WALL = {
  wallTopMetresCD: 4,
  overflowMetresCD: 3.85,
  approachBandMetres: 0.35,
  waterfallWindowMinutes: 15,
  waveAllowanceMetres: 0,
} as const;

export const APP_NAME = "Walpole Bay Conditions";
