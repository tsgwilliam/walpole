"use client";

import { useEffect, useRef } from "react";
import {
  RATIO_SUM,
  chalkSchematic,
  chopMotion,
  frameLevels,
  resolveSection,
  swellOffset,
  waterlineU,
  type PictureMode,
  type SectionInput,
} from "@/lib/section-scene";

const VIEW_W = 1160;
const CREST_Y = 132;
const PX = 220;
const INK = "#1c1915";
const PAPER = "#f4efe4";

function xOf(u: number): number {
  return (u / RATIO_SUM) * VIEW_W;
}

function yOf(schematic: number): number {
  return CREST_Y + (1 - schematic) * PX;
}

function chalkJitter(u: number): number {
  return Math.sin(u * 11.3) * 0.004 + Math.sin(u * 23.1 + 1.4) * 0.002;
}

type Pt = [number, number];

function stroke(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, alpha: number) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawRuns(
  ctx: CanvasRenderingContext2D,
  u0: number,
  u1: number,
  yAt: (u: number) => number,
  width: number,
  alpha: number,
) {
  const step = 0.075;
  let run: Pt[] = [];
  const flush = () => {
    if (run.length > 1) stroke(ctx, run, width, alpha);
    run = [];
  };
  for (let u = u0; u <= u1 + 1e-6; u += step) {
    const uu = Math.min(u, u1);
    const y = yAt(uu);
    const floor = yOf(chalkSchematic(uu) + chalkJitter(uu));
    if (y >= floor - 0.6) {
      flush();
      continue;
    }
    run.push([xOf(uu), y]);
  }
  flush();
}

function chopOffset(u: number, timeS: number, level: SectionInput["chopLevel"], bias: number): number {
  const motion = chopMotion(level, bias);
  const a = Math.sin(u * (3.2 + level * 0.55) + timeS * motion.speed);
  const b = Math.sin(u * (6.8 + level * 0.9) - timeS * motion.speed * 1.33 + 0.6);
  const mix = motion.wobble * 0.28;
  return (motion.amp * (a + mix * b)) / (1 + mix);
}

function biasAt(u: number, pool: number, sea: number): number {
  if (u <= 7.5) return pool;
  if (u >= 8.1) return sea;
  return pool + ((sea - pool) * (u - 7.5)) / 0.6;
}

function makeGrain(w: number, h: number): HTMLCanvasElement {
  const grain = document.createElement("canvas");
  grain.width = w;
  grain.height = h;
  const g = grain.getContext("2d");
  if (!g) return grain;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const specks = Math.min(2800, Math.floor(w * h * 0.018));
  for (let i = 0; i < specks; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const a = 0.025 + rnd() * 0.07;
    g.fillStyle = `rgba(28, 25, 21, ${a})`;
    const s = rnd() > 0.86 ? 1.5 : 0.8;
    g.fillRect(x, y, s, rnd() > 0.7 ? s : 0.7);
  }
  g.strokeStyle = "rgba(28, 25, 21, 0.035)";
  g.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const y = rnd() * h;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y + (rnd() - 0.5) * 8);
    g.stroke();
  }
  return grain;
}

function chalkPoints(u0: number, u1: number, drop: number): Pt[] {
  const pts: Pt[] = [];
  for (let u = u0; u <= u1 + 1e-6; u += 0.05) {
    const uu = Math.min(u, u1);
    pts.push([xOf(uu), yOf(chalkSchematic(uu) - drop + chalkJitter(uu))]);
  }
  return pts;
}

function paint(
  ctx: CanvasRenderingContext2D,
  bw: number,
  bh: number,
  dpr: number,
  input: SectionInput,
  timeS: number,
  grain: HTMLCanvasElement,
) {
  const section = resolveSection(input);
  const frame = frameLevels(section, timeS);
  const cssW = bw / dpr;
  const scale = cssW / VIEW_W;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, bw, bh);
  ctx.drawImage(grain, 0, 0, bw, bh);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

  stroke(ctx, chalkPoints(0, 7.5, 0.06), 0.8, 0.16);
  stroke(ctx, chalkPoints(8.1, RATIO_SUM, 0.06), 0.8, 0.16);
  stroke(ctx, chalkPoints(0, 7.5, 0.12), 0.7, 0.09);
  stroke(ctx, chalkPoints(8.1, RATIO_SUM, 0.12), 0.7, 0.09);

  const surface = (u: number) => {
    const bias = biasAt(u, section.poolBias, section.seaBias);
    const chop = chopOffset(u, timeS, section.chopLevel, bias);
    if (section.mode === "sea") {
      const ampScale = u < 7.5 ? 0.5 + 0.5 * (u / 7.5) : 1;
      return section.seaDraw + swellOffset(u, timeS, section.waveAmp * ampScale, section.wavePeriodS) + chop;
    }
    if (u < 7.5) return frame.pool + chop;
    let sea = section.seaDraw + swellOffset(u, timeS, section.waveAmp, section.wavePeriodS) + chop;
    if (section.mode === "pool" || section.mode === "falling") sea = Math.min(sea, 0.975);
    return sea;
  };

  const still = section.mode === "sea" ? section.seaDraw : frame.pool;
  const shore = waterlineU(still) ?? 0;
  const motion = chopMotion(section.chopLevel, 1);

  const band = (u0: number, u1: number) => {
    if (u1 - u0 < 0.08) return;
    drawRuns(ctx, u0, u1, (u) => yOf(surface(u)), 1.55, 0.92);
    for (let i = 1; i <= motion.lines; i++) {
      const depth = 5 + i * (6 + section.chopLevel * 0.6);
      const alpha = Math.max(0.1, 0.48 - i * 0.05);
      drawRuns(ctx, u0, u1, (u) => yOf(surface(u)) + depth, 0.8, alpha);
    }
  };

  if (section.mode === "sea") band(shore, RATIO_SUM);
  else {
    band(Math.min(shore, 7.5), 7.5);
    band(8.1, RATIO_SUM);
  }

  stroke(ctx, chalkPoints(0, 7.5, 0), 1.75, 0.95);
  stroke(ctx, chalkPoints(8.1, RATIO_SUM, 0), 1.75, 0.95);

  const dryUntil = shore;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 0.28;
  for (const u of [0.18, 0.42, 0.66, 0.9, 1.14]) {
    if (u > dryUntil - 0.08) continue;
    const x = xOf(u);
    const y = yOf(chalkSchematic(u) + chalkJitter(u));
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x - 2.5, y + 12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (frame.sheet > 0.04) {
    const yCrest = yOf(1);
    const yPool = yOf(frame.pool);
    const ySea = yOf(Math.min(1.08, section.seaDraw + frame.phaseSwell));
    const reach = 26 + frame.sheet * 64;
    const lines = frame.sheet > 0.5 ? 3 : frame.sheet > 0.18 ? 2 : 1;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.42 + frame.sheet * 0.35;
    ctx.beginPath();
    ctx.moveTo(xOf(8.1), Math.min(ySea, yCrest));
    ctx.lineTo(xOf(7.5), yCrest + 0.3);
    ctx.stroke();
    for (let i = 0; i < lines; i++) {
      const y0 = yCrest + 0.8 + i * 2.6;
      const y1 = y0 + 2.2;
      const x1 = xOf(7.5) - reach * (0.78 + i * 0.06);
      ctx.beginPath();
      ctx.moveTo(xOf(7.5), y0);
      ctx.quadraticCurveTo(xOf(7.5) - reach * 0.4, y0 + 1.6, x1, Math.min(y1, yPool + 1.2));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const wallX = xOf(7.5);
  const wallW = xOf(8.1) - wallX;
  const wallY = yOf(1);
  const wallH = yOf(-0.015) - wallY;
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 4.6;
  ctx.lineJoin = "miter";
  ctx.strokeRect(wallX, wallY, wallW, wallH);
}

export function SectionCanvas({
  input,
  label,
  mode,
}: {
  input: SectionInput;
  label: string;
  mode: PictureMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef(input);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let stopped = false;
    const t0 = performance.now();
    let grain: HTMLCanvasElement | null = null;
    let grainW = 0;
    let grainH = 0;

    const tick = (now: number) => {
      if (stopped) return;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW < 8 || cssH < 8) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.max(1, Math.round(cssW * dpr));
      const bh = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      if (!grain || grainW !== bw || grainH !== bh) {
        grain = makeGrain(bw, bh);
        grainW = bw;
        grainH = bh;
      }
      paint(ctx, bw, bh, dpr, inputRef.current, (now - t0) / 1000, grain);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="section-canvas"
      role="img"
      aria-label={label}
      data-section-mode={mode}
    />
  );
}
