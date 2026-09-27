import Link from "next/link";
import type { ConditionsSheet } from "@/lib/conditions";
import { CHOP_LEVELS, chopLabel, classifyChop } from "@/lib/chop";
import { glanceMode, MODE_HEADLINE, modeEndAt, modeRemainingLine } from "@/lib/modes";
import { windGlanceLine } from "@/lib/wind-line";
import {
  CLARITY_OPTIONS,
  CROWD_OPTIONS,
  FEEL_OPTIONS,
  labelOf,
  SWIM_OPTIONS,
  TEMP_OPTIONS,
  WHEN_OPTIONS,
  WHERE_OPTIONS,
  WILDLIFE_OPTIONS,
  WIND_OPTIONS,
} from "@/lib/options";
import { formatLondonTime, parseLondonCivil } from "@/lib/time";
import { waterGlanceLines } from "@/lib/water-copy";
import { LiveSection } from "./live-section";
import { lineFrom, surfacePoints } from "./surface-line";
import { TideChart } from "./tide-chart";

function tideTrend(
  points: { t: string; h: number }[],
  nowIso: string,
  height: number,
): "rising" | "falling" | "steady" {
  const now = new Date(nowIso).getTime();
  const target = now - 45 * 60 * 1000;
  let best: { t: number; h: number } | null = null;
  for (const point of points) {
    const t = new Date(point.t).getTime();
    if (t > now) continue;
    if (!best || Math.abs(t - target) < Math.abs(best.t - target)) best = { t, h: point.h };
  }
  if (!best || Math.abs(best.t - target) > 80 * 60 * 1000) return "steady";
  const delta = height - best.h;
  if (delta > 0.03) return "rising";
  if (delta < -0.03) return "falling";
  return "steady";
}

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

function IconClock() {
  return (
    <svg className="note-icon" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11 6.5 V11 L14 13" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function IconWave() {
  return (
    <svg className="note-icon" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M2 9.5c1.6 0 1.6-2.4 3.2-2.4S6.8 9.5 8.4 9.5s1.6-2.4 3.2-2.4 1.6 2.4 3.2 2.4 1.6-2.4 3.2-2.4 1.6 2.4 3.2 2.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 15c1.6 0 1.6-2.4 3.2-2.4S6.8 15 8.4 15s1.6-2.4 3.2-2.4 1.6 2.4 3.2 2.4 1.6-2.4 3.2-2.4 1.6 2.4 3.2 2.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function Glance({
  sheet,
  sectionMode,
}: {
  sheet: ConditionsSheet;
  /** Forces the section clip. Used to photograph each mode. */
  sectionMode?: "pool" | "waterfall" | "sea" | null;
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

  const tideFact = wall
    ? `tide ${wall.heightMetres.toFixed(1)} m CD${trend ? ` · ${trend}` : ""}${sheet.tide?.stale ? " · saved" : ""}`
    : sheet.tideError
      ? "tide quiet"
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

  return (
    <div className="glance-col" id="reading">
      <div className="hero">
        <LiveSection state={wall?.state ?? null} mode={sectionMode} />
        <div className="hero-status">
          <h1 className="now-headline">{mode ? MODE_HEADLINE[mode] : "No reading"}</h1>
          <ul className="facts">
            {remaining ? <li>{remaining}</li> : null}
            <li>{tideFact}</li>
            <li>{airFact}</li>
            {windFact ? <li>{windFact}</li> : null}
          </ul>
          <header className="glance-title">
            <p className="glance-place">
              Walpole Bay <span className="glance-when">· today · now</span>
            </p>
            <nav className="glance-nav" aria-label="Sections">
              <Link href="/observe">Note</Link>
              <Link href="/about">About</Link>
            </nav>
          </header>
        </div>
        <p className="sr-only">
          {mode
            ? `${MODE_HEADLINE[mode]}. ${remaining}. Predicted ${wall!.heightMetres.toFixed(1)} metres Chart Datum${trend ? `, ${trend}` : ""}.`
            : sheet.settingsProblem || sheet.tideError || "Wall reading withheld."}
          {chop ? ` Chop: ${chopLabel(chop.level)}. ${chop.caption}.` : ""}
          {windFact ? ` Wind: ${windFact}.` : ""}
        </p>
      </div>

      <section>
        <h2 className="sec-title">Water choppiness</h2>
        <ol className="chop-list">
          {CHOP_LEVELS.map((item) => {
            const on = chop?.level === item.level;
            return (
              <li key={item.level} className={on ? "chop-level on" : "chop-level"}>
                <span className="chop-mark">
                  <svg className={on ? "chop-sample on" : "chop-sample"} viewBox="0 0 64 28" aria-hidden="true">
                    <path d={lineFrom(surfacePoints(2, 62, 14, item.level))} />
                  </svg>
                </span>
                <p className={on ? "chop-name on" : "chop-name"}>{item.label}</p>
              </li>
            );
          })}
        </ol>
        <p className="sr-only">{chop ? `${chopLabel(chop.level)}. ${chop.caption}` : "Wind unavailable"}</p>
        <p className="chop-caption">{chop ? chop.caption : "wind quiet"}</p>
      </section>

      <section>
        <h2 className="sec-title">Tide today</h2>
        {sheet.tide && sheet.tide.points.length > 1 ? (
          <TideChart points={sheet.tide.points} now={sheet.generatedAt} windows={wall?.waterfallWindows ?? []} />
        ) : (
          <p className="facts">{sheet.tideError ?? "No curve for today."}</p>
        )}
        <p className="sr-only">
          {sheet.tide
            ? sheet.tide.events
                .map((event) => `${event.kind === "high" ? "High water" : "Low water"} ${formatLondonTime(new Date(event.t))}`)
                .join(". ")
            : "Tide curve unavailable."}
        </p>
      </section>

      <section>
        <h2 className="sec-title">Water quality</h2>
        {water.lines.map((line) => (
          <p key={line} className={water.warn ? "water-line warn" : "water-line"}>
            {line}
          </p>
        ))}
      </section>

      <section>
        <h2 className="sec-title">Notes</h2>
        {sheet.observations.length === 0 ? (
          <p className="water-line">none approved</p>
        ) : (
          sheet.observations.map((note) => {
            const when = [labelOf(WHEN_OPTIONS, note.whenSeen), labelOf(WHERE_OPTIONS, note.wherePool)]
              .filter(Boolean)
              .join(" · ");
            const feel = [
              labelOf(FEEL_OPTIONS, note.conditionsFeel),
              labelOf(TEMP_OPTIONS, note.waterTempFeel),
              labelOf(WIND_OPTIONS, note.windFeel),
              labelOf(CLARITY_OPTIONS, note.clarity),
              labelOf(CROWD_OPTIONS, note.crowd),
              labelOf(WILDLIFE_OPTIONS, note.wildlife),
              labelOf(SWIM_OPTIONS, note.swimAgain),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <article className="note-block" key={note.id}>
                <p className="note-row">
                  <IconClock />
                  <span>
                    {when}
                    {note.isSeed ? <span className="note-demo"> demo</span> : null}
                  </span>
                </p>
                {feel ? (
                  <p className="note-row">
                    <IconWave />
                    <span>{feel}</span>
                  </p>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      <footer className="glance-foot">
        <p>
          <a href="https://easytide.admiralty.co.uk/">EasyTide Margate</a>
          {" · "}
          <a href="https://open-meteo.com/">Open-Meteo</a>
          {" · "}
          <a href="https://riversandseaswatch.southernwater.co.uk/">Southern Water</a>
          {" · skin: Kem / Tributary"}
        </p>
        <p>Swim at your own risk.</p>
      </footer>
    </div>
  );
}
