import type { ConditionsSheet } from "@/lib/conditions";
import { chopThresholds } from "@/lib/chop";
import type { GlanceHour, GlanceSource, PlanWindCheck } from "@/lib/glance-at";
import type { PictureMode } from "@/lib/section-scene";
import { parseLondonCivil } from "@/lib/time";
import { waterGlanceLines } from "@/lib/water-copy";
import { GlanceView } from "./glance-view";

function mergeHours(weather: NonNullable<ConditionsSheet["weather"]>): GlanceHour[] {
  return weather.hourly.map((hour) => {
    const t = parseLondonCivil(hour.t);
    let best: (typeof weather.waveHourly)[number] | null = null;
    let bestDt = Infinity;
    for (const wave of weather.waveHourly) {
      const dt = Math.abs(parseLondonCivil(wave.t) - t);
      if (dt < bestDt) {
        bestDt = dt;
        best = wave;
      }
    }
    const matched = best && bestDt <= 45 * 60 * 1000 ? best : null;
    return {
      t,
      tempC: hour.tempC,
      windMph: hour.windMph,
      windGustMph: hour.windGustMph,
      windDirectionDeg: hour.windDirectionDeg,
      waveHeightM: matched?.waveHeightM ?? null,
      wavePeriodS: matched?.wavePeriodS ?? null,
    };
  });
}

function toSource(sheet: ConditionsSheet, sectionMode: PictureMode | null): GlanceSource {
  const weather = sheet.weather;
  const thresholds = chopThresholds();
  return {
    generatedAt: sheet.generatedAt,
    sectionMode,
    settings: {
      wallTopMetresCD: sheet.settings.wallTopMetresCD,
      overflowMetresCD: sheet.settings.overflowMetresCD,
      approachBandMetres: sheet.settings.approachBandMetres,
      waterfallWindowMinutes: sheet.settings.waterfallWindowMinutes,
      waveAllowanceMetres: sheet.settings.waveAllowanceMetres,
    },
    settingsProblem: sheet.settingsProblem,
    tideError: sheet.tideError,
    tide: sheet.tide
      ? {
          stale: sheet.tide.stale,
          points: sheet.tide.points
            .map((point) => ({ t: Date.parse(point.t), h: point.h }))
            .filter((point) => Number.isFinite(point.t)),
          events: sheet.tide.events,
        }
      : null,
    weather: weather
      ? {
          stale: weather.stale,
          temperatureC: weather.temperatureC,
          windMph: weather.windMph,
          windGustMph: weather.windGustMph,
          windDirectionDeg: weather.windDirectionDeg,
          windCompass: weather.windCompass,
          windWord: weather.windWord,
          waveHeightM: weather.waveHeightM,
          wavePeriodS: weather.wavePeriodS,
          hours: mergeHours(weather),
        }
      : null,
    chopLightKt: thresholds.lightKt,
    chopStrongKt: thresholds.strongKt,
  };
}

export function Glance({
  sheet,
  sectionMode,
  initialMinutes,
  planWind,
  demoLabel,
}: {
  sheet: ConditionsSheet;
  /** `?mode=` draws one picture for QA. The live page leaves this unset. */
  sectionMode?: PictureMode | null;
  /** Minutes after the sheet time. `?at=` sets this; the slider starts here. */
  initialMinutes: number;
  /** `?wind=` draws the plan for one wind. The tide and the section stay put. */
  planWind?: PlanWindCheck | null;
  /** Set on `?demo=storm`. Null on the live sheet. */
  demoLabel?: string | null;
}) {
  const water = waterGlanceLines({
    status: sheet.sewage.error || sheet.sewage.status === "unavailable" ? "unavailable" : sheet.sewage.status,
    warning: sheet.sewage.warning,
    forced: sheet.sewage.forced,
    suppressed: sheet.sewage.suppressed,
    lastReleaseEnd: sheet.sewage.lastReleaseEnd,
    nowIso: sheet.generatedAt,
  });
  return (
    <GlanceView
      source={toSource(sheet, sectionMode ?? null)}
      initialMinutes={initialMinutes}
      planWind={planWind ?? null}
      demoLabel={demoLabel ?? null}
      water={{ lines: water.lines, warn: water.warn }}
    />
  );
}
