"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { classifyChop, cliffTemperLine, type ChopLevel } from "@/lib/chop";
import { compassFromDegrees } from "@/lib/compass";
import {
  glanceAt,
  HORIZON_MINUTES,
  prepareGlance,
  type GlanceSource,
  type PlanWindCheck,
  type WindFrame,
} from "@/lib/glance-at";
import { MPH_TO_MS } from "@/lib/wind-line";
import type { SectionInput } from "@/lib/section-scene";
import { LiveSection } from "./live-section";
import { PlanView } from "./plan-view";
import { TideChart } from "./tide-chart";

function windForPlan(wind: WindFrame | null, check: PlanWindCheck | null): WindFrame | null {
  if (!check) return wind;
  const rose = compassFromDegrees(check.fromDeg);
  return {
    compass: rose.short,
    word: rose.word,
    directionDeg: check.fromDeg,
    hasDirection: true,
    avgMs: check.avgMs.toFixed(1),
    periodPhrase: "this drawing",
    gustMs: check.gustMs == null ? null : check.gustMs.toFixed(1),
    stale: false,
    summary: wind?.summary ?? "",
    cliff: cliffTemperLine(rose.short),
  };
}

export function GlanceView({
  source,
  initialMinutes,
  planWind,
  demoLabel,
  water,
}: {
  source: GlanceSource;
  initialMinutes: number;
  planWind: PlanWindCheck | null;
  demoLabel: string | null;
  water: { lines: string[]; warn: boolean };
}) {
  const prepared = useMemo(() => prepareGlance(source), [source]);
  const [minutes, setMinutes] = useState(initialMinutes);
  const frame = useMemo(() => glanceAt(prepared, minutes), [prepared, minutes]);
  const tideWindows = useMemo(() => {
    const span = prepared.source.settings.waterfallWindowMinutes;
    if (!(span > 0)) return [];
    return prepared.crossings.map((start) => ({
      start: new Date(start).toISOString(),
      end: new Date(start + span * 60_000).toISOString(),
    }));
  }, [prepared]);
  const sectionInput = useMemo((): SectionInput | null => {
    if (!frame.section) return null;
    if (!planWind) return frame.section;
    const rose = compassFromDegrees(planWind.fromDeg);
    const windMph = planWind.avgMs / MPH_TO_MS;
    const chop = classifyChop({
      windMph,
      compass: rose.short,
      lightKt: source.chopLightKt,
      strongKt: source.chopStrongKt,
    });
    return {
      ...frame.section,
      windMph,
      compass: rose.short,
      chopLevel: chop.level,
    };
  }, [frame.section, planWind, source.chopLightKt, source.chopStrongKt]);

  const chopLevel = (sectionInput?.chopLevel ?? 2) as ChopLevel;
  const tideEvents = source.tide?.events ?? [];

  return (
    <div
      className="glance-col glance-field"
      id="reading"
      data-glance-minutes={frame.minutesAhead}
      data-glance-mode={frame.mode ?? ""}
      data-sea-m={frame.section?.seaMetresCD ?? ""}
      data-chop={chopLevel}
      data-demo={demoLabel ? "storm" : undefined}
    >
      {demoLabel ? (
        <p className="demo-banner" role="status">
          {demoLabel}
        </p>
      ) : null}
      <div className="hero">
        <LiveSection input={sectionInput} />
      </div>

      <div className="timeline">
        <div className="timeline-scale">
          <span>Now</span>
          <time className="timeline-now" dateTime={frame.at} id="scrub-clock">
            {frame.timeLabel}
          </time>
          <span>+24 h</span>
        </div>
        <input
          className="timeline-range"
          type="range"
          min={0}
          max={HORIZON_MINUTES}
          step={1}
          value={frame.minutesAhead}
          aria-label="Time from now through the next 24 hours"
          aria-describedby="scrub-clock"
          aria-valuemin={0}
          aria-valuemax={HORIZON_MINUTES}
          aria-valuenow={frame.minutesAhead}
          aria-valuetext={frame.timeLabel}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </div>

      <PlanView
        wind={windForPlan(frame.wind, planWind)}
        submerged={frame.mode === "sea"}
        chopLevel={chopLevel}
      />

      <p className="mode-stamp">{frame.headline}</p>

      <section className="tide-block">
        <TideChart
          points={prepared.pointsIso}
          now={frame.at}
          windows={tideWindows}
          events={tideEvents}
          wallTopMetresCD={source.settings.wallTopMetresCD}
        />
      </section>

      <section className="water-block">
        <h2 className="sec-title">Water quality</h2>
        {water.lines.map((line) => (
          <p key={line} className={water.warn ? "water-line warn" : "water-line"}>
            {line}
          </p>
        ))}
      </section>

      <footer className="glance-foot">
        <p>
          {demoLabel ? (
            <>
              Synthetic tide and weather on this sheet
              {" · "}
            </>
          ) : (
            <>
              <a href="https://easytide.admiralty.co.uk/">EasyTide Margate</a>
              {" · "}
              <a href="https://open-meteo.com/">Open-Meteo</a>
              {" · "}
            </>
          )}
          <a href="https://riversandseaswatch.southernwater.co.uk/">Southern Water</a>
          {" · "}
          <Link href="/observe">Note</Link>
          {" · skin: Kem / Tributary"}
        </p>
        <p>Swim at your own risk.</p>
      </footer>

      <p className="sr-only">{frame.sr}</p>
    </div>
  );
}
