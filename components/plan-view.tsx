"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChopLevel } from "@/lib/chop";
import { downwindDegrees } from "@/lib/compass";
import type { WindFrame } from "@/lib/glance-at";
import { chopRoughness, planWindRoughBoost, roughnessAt, waveScanline } from "@/lib/plan-roughness";
import {
  planLayout,
  planProject,
  poolPlanCentroid,
  poolPlanCorners,
  type PlanPoint,
} from "@/lib/pool-plan";
import { quieterZone, type QuietZone } from "@/lib/shelter";
import { windGlyphMark } from "@/lib/wind-glyph";

const VIEW_W = 300;
const VIEW_H = 300;
const PAD = { l: 18, r: 18, t: 44, b: 44 };
const PAPER = "#f4efe4";
const INK = "#1c1915";
const WATER = "#2f74a3";
const FONT = "var(--font-plex), ui-monospace, monospace";

function seaPath(y: number, x0: number, x1: number, phase: number): string {
  const steps = 14;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = x0 + (x1 - x0) * u;
    const wave = Math.sin(u * Math.PI * 2 + phase) * 1.4;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${(y + wave).toFixed(1)}`;
  }
  return d;
}

function pathOf(points: PlanPoint[]): string {
  return points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function poolInteriorPath(corners: { nw: PlanPoint; ne: PlanPoint; se: PlanPoint; sw: PlanPoint }): string {
  const { nw, ne, se, sw } = corners;
  return `${pathOf([nw, ne, se, sw])} Z`;
}

type SpeedLabelPlacement = { x: number; y: number; anchor: "middle"; width: number };

const POOL_STROKE_CLEAR = 8;
function pointInPlanPool(point: PlanPoint, poly: PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function speedLabelRect(box: SpeedLabelPlacement): { left: number; right: number; top: number; bottom: number } {
  const left = box.x - box.width / 2;
  return { left, right: left + box.width, top: box.y - 12, bottom: box.y + 4 };
}

function speedLabelOutsidePool(
  bounds: { nw: PlanPoint; ne: PlanPoint; se: PlanPoint; sw: PlanPoint },
  text: string,
): SpeedLabelPlacement {
  const width = Math.max(58, text.length * 6.4 + 14);
  const poly = [bounds.nw, bounds.ne, bounds.se, bounds.sw];
  const southY = Math.max(bounds.sw.y, bounds.se.y);
  const box: SpeedLabelPlacement = { x: VIEW_W / 2, y: southY + POOL_STROKE_CLEAR + 12, anchor: "middle", width };

  const clear = (rect: { left: number; right: number; top: number; bottom: number }): boolean => {
    if (rect.top < southY + POOL_STROKE_CLEAR) return false;
    const corners: PlanPoint[] = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.left, y: rect.bottom },
      { x: rect.right, y: rect.bottom },
      { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 },
    ];
    return corners.every((p) => !pointInPlanPool(p, poly));
  };

  let rect = speedLabelRect(box);
  while (!clear(rect) && box.y < VIEW_H - 6) {
    box.y += 2;
    rect = speedLabelRect(box);
  }
  return box;
}

function planBeachLabelY(bounds: { sw: PlanPoint; se: PlanPoint }): number {
  const southY = Math.max(bounds.sw.y, bounds.se.y);
  return southY + 28;
}

function WindGlyph({
  at,
  travel,
  avgMs,
  gustMs,
  bounds,
}: {
  at: PlanPoint;
  travel: number;
  avgMs: number;
  gustMs: number | null;
  bounds: { nw: PlanPoint; ne: PlanPoint; se: PlanPoint; sw: PlanPoint };
}) {
  const mark = windGlyphMark(avgMs, gustMs);
  const { mean, gust, meanWidth, gustWidth, head, meanColour, gustColour } = mark;
  const tail = mean * 0.45;
  const tip = tail - mean;
  const gustTip = tip - (gust - mean);
  const wing = head * 0.68;
  const showGust = gust > mean + 0.5;
  const speedLabel = gustMs != null && gustMs > avgMs + 0.05 ? `${avgMs.toFixed(1)} · ${gustMs.toFixed(1)}` : avgMs.toFixed(1);
  const caption = `${speedLabel} m/s`;
  const box = speedLabelOutsidePool(bounds, caption);
  const rectX = box.x - box.width / 2;
  return (
    <>
      <g
        className="wind-glyph"
        data-wind-mean-px={mean.toFixed(1)}
        data-wind-gust-px={gust.toFixed(1)}
        data-wind-width={meanWidth.toFixed(2)}
        data-wind-colour={meanColour}
        transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${travel})`}
      >
        {showGust ? (
          <g className="wind-gust-mark">
            <line x1={0} y1={tail} x2={0} y2={gustTip + head * 0.7} stroke={gustColour} strokeWidth={gustWidth} />
            <path
              d={`M ${(-wing * 0.72).toFixed(1)} ${(gustTip + head * 0.82).toFixed(1)} L 0 ${gustTip.toFixed(1)} L ${(wing * 0.72).toFixed(1)} ${(gustTip + head * 0.82).toFixed(1)}`}
              fill="none"
              stroke={gustColour}
              strokeWidth={gustWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        ) : null}
        <line x1={0} y1={tail} x2={0} y2={tip + head * 0.55} stroke={meanColour} strokeWidth={meanWidth} strokeLinecap="round" />
        <path d={`M 0 ${tip.toFixed(1)} L ${(-wing).toFixed(1)} ${(tip + head).toFixed(1)} H ${wing.toFixed(1)} Z`} fill={meanColour} />
      </g>
      <g className="wind-speed-label" data-outside-pool="true">
        <rect
          x={rectX}
          y={box.y - 12}
          width={box.width}
          height={16}
          fill={PAPER}
          stroke={INK}
          strokeWidth={0.65}
          opacity={0.97}
        />
        <text x={box.x} y={box.y} textAnchor={box.anchor} fill={meanColour} fontSize="11" fontFamily={FONT}>
          {caption}
        </text>
      </g>
    </>
  );
}

function localToPlan(
  lx: number,
  ly: number,
  mid: PlanPoint,
  travelDeg: number,
  layout: ReturnType<typeof planLayout>,
): PlanPoint {
  const rad = (travelDeg * Math.PI) / 180;
  const sx = mid.x + lx * Math.cos(rad) + ly * Math.sin(rad);
  const sy = mid.y - lx * Math.sin(rad) + ly * Math.cos(rad);
  return {
    x: (sx - layout.originX) / layout.scale,
    y: (layout.originY - sy) / layout.scale,
  };
}

function RoughnessField({
  chopLevel,
  zone,
  phase,
  travel,
  mid,
  meanMs,
}: {
  chopLevel: ChopLevel;
  zone: QuietZone | null;
  phase: number;
  travel: number;
  mid: PlanPoint;
  meanMs: number | null;
}) {
  const lines = useMemo(() => {
    const rows: { d: string; opacity: number; width: number }[] = [];
    const windBoost = planWindRoughBoost(meanMs ?? 0);
    const layout = planLayout(VIEW_W, VIEW_H, PAD);
    const corners = poolPlanCorners();
    const nw = planProject(corners.nw, layout);
    const ne = planProject(corners.ne, layout);
    const se = planProject(corners.se, layout);
    const sw = planProject(corners.sw, layout);
    const quietForRough =
      zone == null
        ? null
        : zone.whole
          ? { whole: true, polygon: [] as PlanPoint[] }
          : { whole: false, polygon: zone.polygon };

    const reach = Math.max(
      Math.hypot(nw.x - mid.x, nw.y - mid.y),
      Math.hypot(ne.x - mid.x, ne.y - mid.y),
      Math.hypot(se.x - mid.x, se.y - mid.y),
      Math.hypot(sw.x - mid.x, sw.y - mid.y),
    );
    const half = reach * 2.35;
    const stepY = 3;
    const stepX = 4;

    for (let ly = -half; ly <= half; ly += stepY) {
      let rough = 0;
      for (let lx = -half; lx <= half; lx += stepX) {
        const sample = roughnessAt(localToPlan(lx, ly, mid, travel, layout), chopLevel, quietForRough);
        rough = Math.max(rough, sample + windBoost * (1 - sample * 0.35));
      }
      if (rough < 0.05) continue;
      const amp = (0.85 + rough * 3.1) * (1 + windBoost * 0.5);
      const drift = phase + ly * 0.05;
      const d = waveScanline(-half, half, ly, amp, drift, 3 + rough * 2);
      if (d) {
        rows.push({
          d,
          opacity: Math.min(0.92, 0.3 + rough * 0.62),
          width: 0.9 + rough * 0.75,
        });
      }
    }

    return rows;
  }, [chopLevel, zone, phase, travel, mid, meanMs]);

  return (
    <g clipPath="url(#pool-clip)">
      {zone?.whole && chopRoughness(chopLevel) <= 0.05 ? (
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={INK} opacity={0.03} />
      ) : null}
      <g
        className="plan-chop-lines"
        data-wind-travel={travel.toFixed(1)}
        transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)}) rotate(${travel.toFixed(2)})`}
      >
        {lines.map((row, i) =>
          row.d ? (
            <path key={i} d={row.d} fill="none" stroke={INK} strokeWidth={row.width} opacity={row.opacity} />
          ) : null,
        )}
      </g>
    </g>
  );
}

function PlanDrawing({
  travel,
  avgMs,
  gustMs,
  submerged,
  zone,
  chopLevel,
  phase,
}: {
  travel: number | null;
  avgMs: number | null;
  gustMs: number | null;
  submerged: boolean;
  zone: QuietZone | null;
  chopLevel: ChopLevel;
  phase: number;
}) {
  const layout = planLayout(VIEW_W, VIEW_H, PAD);
  const corners = poolPlanCorners();
  const nw = planProject(corners.nw, layout);
  const ne = planProject(corners.ne, layout);
  const se = planProject(corners.se, layout);
  const sw = planProject(corners.sw, layout);
  const mid = planProject(poolPlanCentroid(), layout);
  const label = (point: PlanPoint) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  const wall = `M ${label(sw)} L ${label(nw)} L ${label(ne)} L ${label(se)}`;
  const poolClip = poolInteriorPath({ nw, ne, se, sw });

  const aria = [
    "Plan of the tidal pool. Sea to the north, beach to the south.",
    submerged ? "The wall is under the water." : "",
    travel != null ? "Wind arrow and speed." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg className="plan-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={aria}>
      <defs>
        <clipPath id="pool-clip">
          <path d={poolClip} />
        </clipPath>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill={PAPER} />
      <text x={VIEW_W / 2} y={nw.y - 18} textAnchor="middle" fill={INK} fontSize="13" fontFamily={FONT} letterSpacing="0.14em">
        Sea
      </text>
      <path d={seaPath(nw.y - 10, nw.x - 2, ne.x + 2, phase * 0.4)} fill="none" stroke={INK} strokeWidth="1" opacity="0.4" />
      {submerged ? (
        <path
          className="wall-wash"
          d={`M ${label(sw)} L ${label(nw)} L ${nw.x.toFixed(1)} ${(nw.y - 8).toFixed(1)} L ${ne.x.toFixed(1)} ${(ne.y - 8).toFixed(1)} L ${label(ne)} L ${label(se)} Z`}
          fill={WATER}
          opacity={0.16}
        />
      ) : null}
      <RoughnessField
        chopLevel={chopLevel}
        zone={zone}
        phase={phase}
        travel={travel ?? 0}
        mid={mid}
        meanMs={avgMs}
      />
      <path
        className="plan-wall"
        data-wall={submerged ? "under" : "solid"}
        d={wall}
        fill="none"
        stroke={INK}
        strokeWidth={submerged ? 4 : 6}
        strokeLinejoin="round"
        strokeLinecap="butt"
        strokeDasharray={submerged ? "6 4.5" : undefined}
        opacity={submerged ? 0.5 : 1}
      />
      <path d={`M ${label(sw)} L ${label(se)}`} fill="none" stroke={INK} strokeWidth="1" opacity="0.65" />
      <text
        x={VIEW_W / 2}
        y={planBeachLabelY({ sw, se })}
        textAnchor="middle"
        fill={INK}
        fontSize="13"
        fontFamily={FONT}
        letterSpacing="0.14em"
      >
        Beach
      </text>
      {travel != null && avgMs != null ? (
        <WindGlyph at={mid} travel={travel} avgMs={avgMs} gustMs={gustMs} bounds={{ nw, ne, se, sw }} />
      ) : null}
    </svg>
  );
}

export function PlanView({
  wind,
  submerged,
  chopLevel,
}: {
  wind: WindFrame | null;
  submerged: boolean;
  chopLevel: ChopLevel;
}) {
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let stop = false;
    const tick = (now: number) => {
      if (stop) return;
      setPhase(now / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  const travel = wind?.hasDirection ? downwindDegrees(wind.directionDeg) : null;
  const avgMs = wind ? Number(wind.avgMs) : null;
  const gustMs = wind?.gustMs != null ? Number(wind.gustMs) : null;
  const zone =
    wind && avgMs != null && Number.isFinite(avgMs)
      ? quieterZone({
          fromDeg: wind.hasDirection ? wind.directionDeg : null,
          speedMs: avgMs,
          gustMs: gustMs != null && Number.isFinite(gustMs) ? gustMs : null,
          compass: wind.hasDirection ? wind.compass : null,
        })
      : null;

  return (
    <figure
      className="plan-card"
      data-wind-from={wind?.hasDirection ? wind.compass : undefined}
      data-wind-ms={wind ? wind.avgMs : undefined}
      data-wind-gust={wind?.gustMs ?? undefined}
      data-wind-travel={travel ?? undefined}
      data-wall={submerged ? "under" : "solid"}
      data-quiet={zone?.whole ? "whole" : zone ? "lee" : "off"}
      data-chop={chopLevel}
    >
      <PlanDrawing
        travel={travel}
        avgMs={avgMs != null && Number.isFinite(avgMs) ? avgMs : null}
        gustMs={gustMs != null && Number.isFinite(gustMs) ? gustMs : null}
        submerged={submerged}
        zone={zone}
        chopLevel={chopLevel}
        phase={reduced ? 0 : phase}
      />
    </figure>
  );
}
