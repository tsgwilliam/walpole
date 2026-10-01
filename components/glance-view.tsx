"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { downwindDegrees } from "@/lib/compass";
import { glanceAt, HORIZON_MINUTES, prepareGlance, type GlanceSource } from "@/lib/glance-at";
import { LiveSection } from "./live-section";

function WindRose({ directionDeg }: { directionDeg: number }) {
  const travel = downwindDegrees(directionDeg);
  return (
    <svg className="wind-rose" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="38" r="26" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M36 16 V20 M36 56 V60 M14 38 H18 M54 38 H58" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <text x="36" y="12" textAnchor="middle">
        N
      </text>
      <g transform={`rotate(${travel} 36 38)`}>
        <path d="M36 50 V26" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M36 22 L29.5 34 H42.5 Z" fill="currentColor" />
      </g>
    </svg>
  );
}

export function GlanceView({
  source,
  initialMinutes,
  water,
}: {
  source: GlanceSource;
  initialMinutes: number;
  water: { lines: string[]; warn: boolean };
}) {
  const prepared = useMemo(() => prepareGlance(source), [source]);
  const [minutes, setMinutes] = useState(initialMinutes);
  const frame = useMemo(() => glanceAt(prepared, minutes), [prepared, minutes]);
  const wind = frame.wind;

  return (
    <div
      className="glance-col"
      id="reading"
      data-glance-minutes={frame.minutesAhead}
      data-glance-mode={frame.mode ?? ""}
      data-sea-m={frame.section?.seaMetresCD ?? ""}
      data-chop={frame.section?.chopLevel ?? ""}
    >
      <div className="hero">
        <LiveSection input={frame.section} />
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

      <div className="mode-block">
        <h1 className="now-headline">{frame.headline}</h1>
        {frame.remaining ? <p className="mode-remain">{frame.remaining}</p> : null}
      </div>

      <p className="facts-strip">
        <span>{frame.tideFact}</span>
        <span>{frame.airFact}</span>
        {wind ? null : <span>wind quiet</span>}
      </p>

      {wind ? (
        <div className="wind-card" data-wind-from={wind.compass} data-wind-ms={wind.avgMs}>
          {wind.hasDirection ? <WindRose directionDeg={wind.directionDeg} /> : <div className="wind-rose wind-rose-empty" aria-hidden="true" />}
          <div className="wind-copy">
            <p className="wind-from">{wind.hasDirection ? `from the ${wind.word}` : "direction unknown"}</p>
            <p className="wind-nums wind-avg">
              {wind.avgMs} m/s · {wind.periodPhrase}
              {wind.stale ? " · saved" : ""}
            </p>
            {wind.gustMs ? <p className="wind-nums">gusts {wind.gustMs} m/s</p> : null}
          </div>
          <p className="wind-cliff">{wind.cliff}</p>
        </div>
      ) : null}

      {frame.extrema ? <p className="tide-extrema">{frame.extrema}</p> : null}

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

      <p className="sr-only">{frame.sr}</p>
    </div>
  );
}
