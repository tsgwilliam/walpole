import { formatLondonDate, londonMinutes } from "@/lib/time";
import { splitTideAt, tideCurveForDay, tideWavePath, type TideSample } from "@/lib/tide-curve";

type Window = { start: string; end: string };

const W = 640;
const H = 200;
const PAD = { l: 8, r: 10, t: 22, b: 26 };
const PAPER = "#f4efe4";

export function TideChart({
  points,
  now,
  windows,
}: {
  points: TideSample[];
  now: string;
  windows: Window[];
}) {
  const curve = tideCurveForDay(points, now, windows);
  if (curve.points.length < 2) {
    return <p className="fine">Not enough of this day&apos;s curve to draw.</p>;
  }
  const heights = curve.points.map((point) => point.h);
  const yMin = Math.min(...heights) - 0.25;
  const yMax = Math.max(...heights) + 0.35;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const xOf = (iso: string) => PAD.l + (londonMinutes(new Date(iso)) / 1440) * innerW;
  const yOf = (h: number) => PAD.t + ((yMax - h) / (yMax - yMin)) * innerH;
  const base = PAD.t + innerH;
  const split = splitTideAt(curve.points, now);
  const nowH = split.nowH ?? heights[0];
  const nowX = Math.min(W - PAD.r, Math.max(PAD.l, xOf(now)));
  const hours = [0, 6, 12, 18];
  const nowMs = new Date(now).getTime();
  const labelWindow =
    curve.windows.find((window) => new Date(window.end).getTime() >= nowMs) ??
    curve.windows[curve.windows.length - 1];
  const toXY = (pts: TideSample[]) => pts.map((point) => ({ x: xOf(point.t), y: yOf(point.h) }));
  const dayLabel = formatLondonDate(new Date(now));

  return (
    <svg
      className="tide-wave"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      data-tide-day={curve.dayKey}
      data-tide-now={now}
      aria-label={`${dayLabel}, Europe/London. Grey is before the selected time and the rest is the forecast. The marker is that time. A coral band is the waterfall.`}
    >
      <rect width={W} height={H} fill={PAPER} />
      {curve.windows.map((window) => {
        const x = xOf(window.start);
        const width = Math.max(3, xOf(window.end) - x);
        const labelThis = window.start === labelWindow?.start;
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
          <g key={window.start}>
            <rect x={x} y={PAD.t} width={width} height={innerH} fill="rgba(196,71,54,0.22)" />
            {labelThis ? (
              <text x={labelX} y={14} textAnchor={anchor} fill="#c44736" fontSize="11" fontFamily="var(--font-plex), ui-monospace, monospace">
                waterfall
              </text>
            ) : null}
          </g>
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} stroke="#1c1915" strokeWidth="1" />
      {split.past.length > 1 ? (
        <path d={tideWavePath(toXY(split.past))} fill="none" stroke="#9a9488" strokeWidth="1.7" />
      ) : null}
      {split.future.length > 1 ? (
        <path d={tideWavePath(toXY(split.future))} fill="none" stroke="var(--water)" strokeWidth="1.8" />
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
