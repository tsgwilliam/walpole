import Link from "next/link";
import type { ConditionsSheet } from "@/lib/conditions";
import { chopLabel, classifyChop } from "@/lib/chop";
import { glanceMode, MODE_HEADLINE, modeEndAt, modeRemainingLine } from "@/lib/modes";
import type { PictureMode } from "@/lib/section-scene";
import { recentTidePeak, tideExtremesLine, tideTrend } from "@/lib/tide-glance";
import { windGlanceLine } from "@/lib/wind-line";
import { parseLondonCivil } from "@/lib/time";
import { waterGlanceLines } from "@/lib/water-copy";
import { LiveSection } from "./live-section";

function waterLine(sewage: ConditionsSheet["sewage"], nowIso: string) {
  return waterGlanceLines({
    status: sewage.error || sewage.status === "unavailable" ? "unavailable" : sewage.status,
    warning: sewage.warning,
    forced: sewage.forced,
    suppressed: sewage.suppressed,
    lastReleaseEnd: sewage.lastReleaseEnd,
    nowIso,
  });
}

export function Glance({
  sheet,
  sectionMode,
}: {
  sheet: ConditionsSheet;
  /** `?mode=` draws one picture for QA. The live page leaves this unset. */
  sectionMode?: PictureMode | null;
}) {
  const wall = sheet.wall;
  const weather = sheet.weather;
  const chop = weather
    ? classifyChop({ windMph: weather.windMph, compass: weather.windCompass })
    : null;
  const trend = wall && sheet.tide ? tideTrend(sheet.tide.points, sheet.generatedAt, wall.heightMetres) : null;
  const mode = wall ? glanceMode(wall.state) : null;
  const remaining = mode
    ? modeRemainingLine(mode, modeEndAt(wall!.state, wall!.changes, sheet.generatedAt), sheet.generatedAt)
    : null;
  const water = waterLine(sheet.sewage, sheet.generatedAt);
  const extrema = sheet.tide ? tideExtremesLine(sheet.tide.events) : null;

  const tideFact = wall
    ? `tide ${wall.heightMetres.toFixed(1)} m CD${trend ? ` · ${trend}` : ""}${sheet.tide?.stale ? " · saved" : ""}`
    : "tide quiet";

  const airFact = weather
    ? `air ${Math.round(weather.temperatureC)}°${weather.stale ? " · saved" : ""}`
    : "air quiet";
  const windFact = weather
    ? windGlanceLine({
        compass: weather.windCompass,
        windMph: weather.windMph,
        windGustMph: weather.windGustMph,
        hourly: weather.hourly.map((hour) => ({ t: parseLondonCivil(hour.t), windMph: hour.windMph })),
        nowIso: sheet.generatedAt,
        stale: weather.stale,
      })
    : null;

  const section =
    sectionMode || wall
      ? {
          mode: sectionMode ?? null,
          seaMetresCD: wall?.heightMetres ?? null,
          wallTopMetresCD: sheet.settings.wallTopMetresCD,
          falling: trend === "falling",
          recentPeakMetresCD: sheet.tide ? recentTidePeak(sheet.tide.points, sheet.generatedAt) : null,
          waveHeightM: weather?.waveHeightM ?? null,
          wavePeriodS: weather?.wavePeriodS ?? null,
          windMph: weather?.windMph ?? null,
          chopLevel: chop?.level ?? 2,
          compass: weather?.windCompass ?? null,
        }
      : null;

  return (
    <div className="glance-col" id="reading">
      <div className="hero">
        <LiveSection input={section} />
      </div>

      <div className="mode-block">
        <h1 className="now-headline">{mode ? MODE_HEADLINE[mode] : "No reading"}</h1>
        {remaining ? <p className="mode-remain">{remaining}</p> : null}
      </div>

      <p className="facts-strip">
        <span>{tideFact}</span>
        <span>{airFact}</span>
        {windFact ? <span>{windFact}</span> : null}
      </p>
      {extrema ? <p className="tide-extrema">{extrema}</p> : null}

      <section>
        <h2 className="sec-title">Water quality</h2>
        {water.lines.map((line) => (
          <p key={line} className={water.warn ? "water-line warn" : "water-line"}>
            {line}
          </p>
        ))}
      </section>

      <footer className="glance-foot">
        <p>
          <a href="https://easytide.admiralty.co.uk/">EasyTide Margate</a>
          {" · "}
          <a href="https://open-meteo.com/">Open-Meteo</a>
          {" · "}
          <a href="https://riversandseaswatch.southernwater.co.uk/">Southern Water</a>
          {" · "}
          <Link href="/observe">Note</Link>
          {" · skin: Kem / Tributary"}
        </p>
        <p>Swim at your own risk.</p>
      </footer>

      <p className="sr-only">
        {mode
          ? `${MODE_HEADLINE[mode]}. ${remaining}. Predicted ${wall!.heightMetres.toFixed(1)} metres Chart Datum${trend ? `, ${trend}` : ""}.`
          : sheet.settingsProblem || sheet.tideError || "Wall reading withheld."}
        {chop ? ` Chop: ${chopLabel(chop.level)}. ${chop.caption}.` : ""}
        {windFact ? ` Wind: ${windFact}.` : ""}
        {extrema ? ` ${extrema}.` : ""}
      </p>
    </div>
  );
}
