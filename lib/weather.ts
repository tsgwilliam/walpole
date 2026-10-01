import { LINKS, POOL } from "./constants";
import { loadCached } from "./cache";
import { compassFromDegrees } from "./compass";
import { londonDayKey } from "./time";

export type WeatherBundle = {
  time: string;
  temperatureC: number;
  rainMm: number;
  precipitationMm: number;
  weatherCode: number;
  summary: string;
  windMph: number;
  windGustMph: number | null;
  windDirectionDeg: number;
  windCompass: string;
  windWord: string;
  todayRainMm: number;
  todayMaxRainChance: number | null;
  /** Open-Meteo Marine at the pin. Null when that feed does not answer. */
  waveHeightM: number | null;
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  hourly: {
    t: string;
    tempC: number;
    rainMm: number;
    pop: number | null;
    windMph: number;
    windGustMph: number | null;
    windDirectionDeg: number | null;
  }[];
  /** Marine hourly at the pin. Empty when that feed does not answer. */
  waveHourly: { t: string; waveHeightM: number | null; wavePeriodS: number | null }[];
};

const THREE_HOURS = 3 * 60 * 60 * 1000;

export { compassFromDegrees } from "./compass";

export function weatherSummary(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunder";
  return "Weather on the pin";
}

type Raw = {
  current?: {
    time?: string;
    temperature_2m?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: (number | null)[];
    rain?: number[];
    wind_speed_10m?: number[];
    wind_gusts_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
  };
};

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fetchWave(): Promise<{
  waveHeightM: number | null;
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  hourly: { t: string; waveHeightM: number | null; wavePeriodS: number | null }[];
} | null> {
  try {
    const url = new URL("https://marine-api.open-meteo.com/v1/marine");
    url.searchParams.set("latitude", String(POOL.latitude));
    url.searchParams.set("longitude", String(POOL.longitude));
    url.searchParams.set("current", "wave_height,wave_period,wave_direction");
    url.searchParams.set("hourly", "wave_height,wave_period");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("cell_selection", "sea");
    url.searchParams.set("timezone", "Europe/London");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "WalpoleBayConditions/0.1" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const raw = (await response.json()) as {
      current?: { wave_height?: number; wave_period?: number; wave_direction?: number };
      hourly?: { time?: string[]; wave_height?: (number | null)[]; wave_period?: (number | null)[] };
    };
    const times = raw.hourly?.time ?? [];
    const hourly = times.map((t, i) => ({
      t,
      waveHeightM: finiteOrNull(raw.hourly?.wave_height?.[i]),
      wavePeriodS: finiteOrNull(raw.hourly?.wave_period?.[i]),
    }));
    const height = finiteOrNull(raw.current?.wave_height);
    if (height == null && hourly.every((hour) => hour.waveHeightM == null)) return null;
    return {
      waveHeightM: height,
      wavePeriodS: finiteOrNull(raw.current?.wave_period),
      waveDirectionDeg: finiteOrNull(raw.current?.wave_direction),
      hourly,
    };
  } catch {
    return null;
  }
}

async function fetchForecast(): Promise<
  Omit<WeatherBundle, "waveHeightM" | "wavePeriodS" | "waveDirectionDeg" | "waveHourly">
> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(POOL.latitude));
  url.searchParams.set("longitude", String(POOL.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,precipitation_probability,rain,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
  );
  url.searchParams.set("timezone", "Europe/London");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("wind_speed_unit", "mph");
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "WalpoleBayConditions/0.1" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
  const raw = (await response.json()) as Raw;
  const current = raw.current;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.wind_speed_10m !== "number") {
    throw new Error("Open-Meteo returned no current weather.");
  }
  const times = raw.hourly?.time ?? [];
  const today = londonDayKey(new Date());
  const hourly = times.map((t, i) => ({
    t,
    tempC: raw.hourly?.temperature_2m?.[i] ?? NaN,
    rainMm: raw.hourly?.rain?.[i] ?? 0,
    pop: raw.hourly?.precipitation_probability?.[i] ?? null,
    windMph: raw.hourly?.wind_speed_10m?.[i] ?? NaN,
    windGustMph: finiteOrNull(raw.hourly?.wind_gusts_10m?.[i]),
    windDirectionDeg: finiteOrNull(raw.hourly?.wind_direction_10m?.[i]),
  }));
  const todayHours = hourly.filter((h) => h.t.startsWith(today));
  const todayRainMm = todayHours.reduce((sum, h) => sum + (Number.isFinite(h.rainMm) ? h.rainMm : 0), 0);
  const pops = todayHours.map((h) => h.pop).filter((p): p is number => typeof p === "number");
  const dir = current.wind_direction_10m ?? 0;
  const compass = compassFromDegrees(dir);
  return {
    time: current.time ?? new Date().toISOString(),
    temperatureC: current.temperature_2m,
    rainMm: current.rain ?? 0,
    precipitationMm: current.precipitation ?? 0,
    weatherCode: current.weather_code ?? -1,
    summary: weatherSummary(current.weather_code ?? -1),
    windMph: current.wind_speed_10m,
    windGustMph: typeof current.wind_gusts_10m === "number" ? current.wind_gusts_10m : null,
    windDirectionDeg: dir,
    windCompass: compass.short,
    windWord: compass.word,
    todayRainMm,
    todayMaxRainChance: pops.length ? Math.max(...pops) : null,
    hourly: hourly.filter((h) => Number.isFinite(h.tempC)),
  };
}

async function fetchWeather(): Promise<WeatherBundle> {
  const [forecast, wave] = await Promise.all([fetchForecast(), fetchWave()]);
  return {
    ...forecast,
    waveHeightM: wave?.waveHeightM ?? null,
    wavePeriodS: wave?.wavePeriodS ?? null,
    waveDirectionDeg: wave?.waveDirectionDeg ?? null,
    waveHourly: wave?.hourly ?? [],
  };
}

export async function getWeather(fresh: boolean) {
  return loadCached("weather-pool-v2", THREE_HOURS, fresh, fetchWeather);
}

export const WEATHER_SOURCE = {
  name: "Open-Meteo",
  url: LINKS.openMeteo,
  note: "Model weather at the pool pin, plus marine wave height when that feed answers. Not a beach anemometer. Cached and refreshed a few times a day.",
};
