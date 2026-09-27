import { londonMinutes } from "@/lib/time";

type Point = { t: string; h: number };
type Window = { start: string; end: string };

const W = 640;
const H = 168;
const PAD = { l: 8, r: 10, t: 22, b: 26 };

export function TideChart({
  points,
  now,
  windows,
}: {
  points: Point[];
  now: string;
  windows: Window[];
}) {
  if (points.length < 2) {
    return <p className="fine">Not enough of today&apos;s curve to draw.</p>;
  }
  const heights = points.map((p) => p.h);
  const yMin = Math.min(...heights) - 0.25;
  const yMax = Math.max(...heights) + 0.35;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xOf = (iso: string) => PAD.l + (londonMinutes(new Date(iso)) / 1440) * innerW;
  const yOf = (h: number) => PAD.t + ((yMax - h) / (yMax - yMin)) * innerH;
  const base = PAD.t + innerH;
  const nowX = Math.min(W - PAD.r, Math.max(PAD.l, xOf(now)));
  const nowH = interpolate(points, now) ?? heights[0];
  const hours = [0, 6, 12, 18];
  const nowMs = new Date(now).getTime();
  const labelWindow =
    windows.find((w) => new Date(w.end).getTime() >= nowMs) ?? windows[windows.length - 1];
  const nowPoint = { t: now, h: nowH };
  const past = [...points.filter((p) => new Date(p.t).getTime() <= nowMs), nowPoint];
  const future = [nowPoint, ...points.filter((p) => new Date(p.t).getTime() > nowMs)];
  const strokeOf = (pts: Point[]) =>
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.t).toFixed(1)} ${yOf(p.h).toFixed(1)}`)
      .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Today's Margate tide curve in Europe/London clock time. The past is grey. A black dot is now. A coral band is the waterfall."
    >
      {windows.map((w) => {
        const x = xOf(w.start);
        const width = Math.max(3, xOf(w.end) - x);
        const labelThis = w.start === labelWindow?.start;
        const word = 72;
        const rightLimit = W - PAD.r;
        const candidates: { x: number; anchor: "start" | "end" }[] = [
          { x: Math.min(x, rightLimit - word), anchor: "start" },
          { x: Math.min(Math.max(x + width, PAD.l + word), rightLimit), anchor: "end" },
          { x: Math.max(PAD.l + word, nowX - 12), anchor: "end" },
          { x: Math.min(rightLimit - word, nowX + 12), anchor: "start" },
        ];
        let labelX = PAD.l;
        let anchor: "start" | "end" = "start";
        for (const candidate of candidates) {
          const left = candidate.anchor === "start" ? candidate.x : candidate.x - word;
          const right = left + word;
          if (left < PAD.l - 1 || right > rightLimit + 1) continue;
          if (nowX > left - 6 && nowX < right + 6) continue;
          labelX = candidate.x;
          anchor = candidate.anchor;
          break;
        }
        return (
          <g key={w.start}>
            <rect x={x} y={PAD.t} width={width} height={innerH} fill="rgba(196,71,54,0.22)" />
            {labelThis ? (
              <text
                x={labelX}
                y={12}
                textAnchor={anchor}
                fill="#c44736"
                fontSize="11"
                fontFamily="var(--font-plex), ui-monospace, monospace"
              >
                waterfall
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke="#1c1915" strokeWidth="1" />
      {past.length > 1 ? (
        <path d={strokeOf(past)} fill="none" stroke="#9a9488" strokeWidth="1.7" />
      ) : null}
      {future.length > 1 ? (
        <path d={strokeOf(future)} fill="none" stroke="var(--water)" strokeWidth="1.8" />
      ) : null}
      <line x1={nowX} x2={nowX} y1={PAD.t} y2={base} stroke="#1c1915" strokeWidth="1" />
      <circle cx={nowX} cy={yOf(nowH)} r="3.6" fill="#1c1915" />
      <text
        x={nowX + (nowX > W - 36 ? -8 : 8)}
        y={Math.min(base - 4, Math.max(PAD.t + 14, yOf(nowH) - 8))}
        textAnchor={nowX > W - 36 ? "end" : "start"}
        fill="#1c1915"
        fontSize="11"
        fontFamily="var(--font-plex), ui-monospace, monospace"
      >
        now
      </text>
      {hours.map((hour) => {
        const x = PAD.l + (hour / 24) * innerW;
        const anchor = hour === 0 ? "start" : "middle";
        return (
          <g key={hour}>
            <line x1={x} x2={x} y1={base} y2={base + 4} stroke="#1c1915" />
            <text x={x} y={H - 6} textAnchor={anchor} fill="#5e584e" fontSize="11" fontFamily="var(--font-plex), ui-monospace, monospace">
              {`${String(hour).padStart(2, "0")}:00`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function interpolate(points: Point[], iso: string): number | null {
  const t = new Date(iso).getTime();
  const samples = points.map((p) => ({ t: new Date(p.t).getTime(), h: p.h })).sort((a, b) => a.t - b.t);
  if (samples.length === 0) return null;
  if (t <= samples[0].t) return samples[0].h;
  if (t >= samples[samples.length - 1].t) return samples[samples.length - 1].h;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  if (a.t === b.t) return a.h;
  const u = (t - a.t) / (b.t - a.t);
  return a.h + (b.h - a.h) * u;
}
