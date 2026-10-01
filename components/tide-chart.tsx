"use client";

import { WORKING_WALL } from "@/lib/geography";
import { formatLondonDate } from "@/lib/time";
import { formatTideClock, tidePlotX } from "@/lib/tide-axis";
import { splitTideAt, tideCurveForDay, tideWavePath, type TideSample } from "@/lib/tide-curve";

type Window = { start: string; end: string };
type TideEvent = { t: string; h: number; kind: "high" | "low" };

const W = 640;
const H = 220;
const PAD = { l: 36, r: 14, t: 18, b: 30 };
const PAPER = "#f4efe4";
const INK = "#1c1915";
const INK_SOFT = "#5e584e";
const FONT = "var(--font-plex), ui-monospace, monospace";

export function TideChart({
  points,
  now,
  windows,
  events,
  wallTopMetresCD = WORKING_WALL.crestMetresCD,
}: {
  points: TideSample[];
  now: string;
  windows: Window[];
  events?: TideEvent[];
  wallTopMetresCD?: number;
}) {
  const curve = tideCurveForDay(points, now, windows);
  if (curve.points.length < 2) {
    return <p className="fine">Not enough of this day&apos;s curve to draw.</p>;
  }
  const heights = curve.points.map((point) => point.h);
  const yMin = Math.min(...heights, wallTopMetresCD) - 0.35;
  const yMax = Math.max(...heights, wallTopMetresCD) + 0.35;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xOf = (iso: string) => tidePlotX(iso, now, PAD.l, innerW);
  const yOf = (h: number) => PAD.t + ((yMax - h) / (yMax - yMin)) * innerH;
  const base = PAD.t + innerH;
  const split = splitTideAt(curve.points, now);
  const nowH = split.nowH ?? heights[0];
  const nowX = xOf(now);
  const toXY = (pts: TideSample[]) => pts.map((point) => ({ x: xOf(point.t), y: yOf(point.h) }));
  const dayLabel = formatLondonDate(new Date(now));
  const dayEvents = (events ?? []).filter((event) => {
    const key = formatLondonDate(new Date(event.t));
    return key === curve.dayKey;
  });

  const aria = `${dayLabel}. Tide height in metres Chart Datum. The marker is the scrubbed time.`;

  return (
    <svg
      className="tide-wave"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      data-tide-day={curve.dayKey}
      data-tide-now={now}
      data-tide-now-frac="0.2"
      aria-label={aria}
    >
      <rect width={W} height={H} fill={PAPER} />
      {curve.windows.map((window) => {
        const x = xOf(window.start);
        const width = Math.max(3, xOf(window.end) - x);
        return (
          <rect key={window.start} x={x} y={PAD.t} width={width} height={innerH} fill="rgba(196,71,54,0.18)" />
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke={INK} strokeWidth="1" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={base} stroke={INK} strokeWidth="1" opacity="0.35" />
      {wallTopMetresCD >= yMin && wallTopMetresCD <= yMax ? (
        <g className="tide-crest">
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yOf(wallTopMetresCD)}
            y2={yOf(wallTopMetresCD)}
            stroke={INK}
            strokeWidth="0.8"
            strokeDasharray="5 4"
            opacity="0.45"
          />
          <text
            x={PAD.l - 4}
            y={yOf(wallTopMetresCD) + 3}
            textAnchor="end"
            fill={INK_SOFT}
            fontSize="10"
            fontFamily={FONT}
          >
            {wallTopMetresCD.toFixed(1)}
          </text>
        </g>
      ) : null}
      {split.past.length > 1 ? (
        <path d={tideWavePath(toXY(split.past))} fill="none" stroke="#9a9488" strokeWidth="1.7" />
      ) : null}
      {split.future.length > 1 ? (
        <path d={tideWavePath(toXY(split.future))} fill="none" stroke="var(--water)" strokeWidth="1.8" />
      ) : null}
      {dayEvents.map((event) => {
        const x = xOf(event.t);
        const y = yOf(event.h);
        const label = formatTideClock(event.t);
        return (
          <g key={`${event.kind}-${event.t}`} className="tide-extreme">
            <line x1={x} x2={x} y1={base} y2={base + 5} stroke={INK} strokeWidth="1" />
            <text x={x} y={H - 8} textAnchor="middle" fill={INK_SOFT} fontSize="10" fontFamily={FONT}>
              {label}
            </text>
            <circle cx={x} cy={y} r="2.8" fill={INK} />
            <text
              x={PAD.l - 4}
              y={y + 3}
              textAnchor="end"
              fill={INK}
              fontSize="10"
              fontFamily={FONT}
            >
              {event.h.toFixed(1)}
            </text>
          </g>
        );
      })}
      <line x1={nowX} x2={nowX} y1={PAD.t} y2={base} stroke={INK} strokeWidth="1.15" />
      <circle cx={nowX} cy={yOf(nowH)} r="3.8" fill={INK} />
    </svg>
  );
}
