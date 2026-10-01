"use client";

import { useMemo } from "react";
import { formatLondonDate } from "@/lib/time";
import {
  formatTideClock,
  spacedExtremeTicks,
  tideNowPlotX,
  tidePlotX,
  tideVisibleWindow,
} from "@/lib/tide-axis";
import { interpolateTide, splitTideAt, tideWavePath, type TideSample } from "@/lib/tide-curve";

type Window = { start: string; end: string };
type TideEvent = { t: string; h: number; kind: "high" | "low" };

const W = 640;
const H = 220;
const PAD = { l: 40, r: 12, t: 16, b: 28 };
const PAPER = "#f4efe4";
const INK = "#1c1915";
const INK_SOFT = "#5e584e";
const FONT = "var(--font-plex), ui-monospace, monospace";
const SAMPLE_STEP_MS = 10 * 60 * 1000;

function denseWindowSamples(points: TideSample[], startMs: number, endMs: number): TideSample[] {
  const out: TideSample[] = [];
  for (let t = startMs; t <= endMs; t += SAMPLE_STEP_MS) {
    const h = interpolateTide(points, new Date(t).toISOString());
    if (h != null) out.push({ t: new Date(t).toISOString(), h });
  }
  return out;
}

export function TideChart({
  points,
  now,
  windows,
  events,
}: {
  points: TideSample[];
  now: string;
  windows: Window[];
  events?: TideEvent[];
  wallTopMetresCD?: number;
}) {
  const nowMs = Date.parse(now);
  const visible = useMemo(() => tideVisibleWindow(nowMs), [nowMs]);

  const windowPoints = useMemo(
    () => denseWindowSamples(points, visible.startMs, visible.endMs),
    [points, visible.startMs, visible.endMs],
  );

  if (windowPoints.length < 2 || !Number.isFinite(nowMs)) {
    return <p className="fine">Not enough tide curve to draw.</p>;
  }

  const heights = windowPoints.map((point) => point.h);
  const yMin = Math.min(...heights);
  const yMax = Math.max(...heights);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const plotRight = W - PAD.r;
  const xOf = (iso: string) => tidePlotX(Date.parse(iso), visible, PAD.l, innerW);
  const yOf = (h: number) => PAD.t + ((yMax - h) / Math.max(0.08, yMax - yMin)) * innerH;
  const base = PAD.t + innerH;
  const split = splitTideAt(windowPoints, now);
  const nowH = split.nowH ?? heights[0];
  const nowX = tideNowPlotX(PAD.l, innerW);
  const toXY = (pts: TideSample[]) =>
    pts
      .map((point) => ({ x: xOf(point.t), y: yOf(point.h) }))
      .filter((point) => point.x >= PAD.l - 1 && point.x <= plotRight + 1);
  const dayLabel = formatLondonDate(new Date(now));

  const windowEvents = spacedExtremeTicks(
    (events ?? [])
      .filter((event) => {
        const t = Date.parse(event.t);
        return Number.isFinite(t) && t >= visible.startMs && t <= visible.endMs;
      })
      .map((event) => ({ event, x: xOf(event.t) }))
      .filter((row) => row.x >= PAD.l && row.x <= plotRight),
    46,
  ).map((row) => row.event);

  const aria = `${dayLabel}. Tide height in metres Chart Datum. The marker is the scrubbed time.`;

  return (
    <svg
      className="tide-wave"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      data-tide-now={now}
      data-tide-now-frac="0.2"
      aria-label={aria}
    >
      <defs>
        <clipPath id="tide-plot-clip">
          <rect x={PAD.l} y={PAD.t} width={innerW} height={innerH} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={PAPER} />
      <g clipPath="url(#tide-plot-clip)">
        {windows.map((window) => {
          const start = Date.parse(window.start);
          const end = Date.parse(window.end);
          if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
          if (end <= visible.startMs || start >= visible.endMs) return null;
          const x = xOf(new Date(Math.max(start, visible.startMs)).toISOString());
          const xEnd = xOf(new Date(Math.min(end, visible.endMs)).toISOString());
          const width = Math.max(2, xEnd - x);
          return <rect key={window.start} x={x} y={PAD.t} width={width} height={innerH} fill="rgba(196,71,54,0.18)" />;
        })}
        {split.past.length > 1 ? (
          <path d={tideWavePath(toXY(split.past))} fill="none" stroke="#9a9488" strokeWidth="1.7" />
        ) : null}
        {split.future.length > 1 ? (
          <path d={tideWavePath(toXY(split.future))} fill="none" stroke="var(--water)" strokeWidth="1.8" />
        ) : null}
      </g>
      <line x1={PAD.l} x2={plotRight} y1={base} y2={base} stroke={INK} strokeWidth="1" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={base} stroke={INK} strokeWidth="1" opacity="0.35" />
      <text x={PAD.l - 6} y={yOf(yMax) + 3} textAnchor="end" fill={INK} fontSize="10" fontFamily={FONT}>
        {yMax.toFixed(1)}
      </text>
      <text x={PAD.l - 6} y={yOf(yMin) + 3} textAnchor="end" fill={INK} fontSize="10" fontFamily={FONT}>
        {yMin.toFixed(1)}
      </text>
      {windowEvents.map((event) => {
        const x = xOf(event.t);
        return (
          <g key={`${event.kind}-${event.t}`} className="tide-extreme">
            <line x1={x} x2={x} y1={base} y2={base + 5} stroke={INK} strokeWidth="1" />
            <text x={x} y={H - 7} textAnchor="middle" fill={INK_SOFT} fontSize="10" fontFamily={FONT}>
              {formatTideClock(event.t)}
            </text>
            <circle cx={x} cy={yOf(event.h)} r="2.6" fill={INK} />
          </g>
        );
      })}
      <line x1={nowX} x2={nowX} y1={PAD.t} y2={base} stroke={INK} strokeWidth="1.15" />
      <circle cx={nowX} cy={yOf(nowH)} r="3.8" fill={INK} />
    </svg>
  );
}
