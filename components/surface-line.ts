import type { ChopLevel } from "@/lib/chop";

/** Stroke for the water-choppiness samples. The section itself uses Tom's clips. */
export function surfacePoints(x0: number, x1: number, y: number, chop: ChopLevel): [number, number][] {
  const pts: [number, number][] = [[x0, y]];
  if (chop === 1 || x1 - x0 < 10) {
    pts.push([x1, y]);
    return pts;
  }
  const step = chop === 5 ? 5 : chop === 4 ? 8 : chop === 3 ? 14 : 22;
  const amp = chop === 5 ? 3.4 : chop === 4 ? 2.6 : chop === 3 ? 1.8 : 1.1;
  let i = 0;
  for (let x = x0 + step; x < x1 - 1; x += step) {
    const wobble = chop >= 4 ? 0.45 + ((i * 3) % 5) / 5 : 1;
    const dy = (i % 2 === 0 ? -1 : 1) * amp * wobble;
    pts.push([x, y + dy]);
    i += 1;
  }
  pts.push([x1, y]);
  return pts;
}

export function lineFrom(pts: [number, number][]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}
