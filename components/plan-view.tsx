import { compassFromDegrees, downwindDegrees } from "@/lib/compass";
import { LINKS } from "@/lib/constants";
import type { WindFrame } from "@/lib/glance-at";
import {
  planLayout,
  planProject,
  poolPlanCentroid,
  poolPlanCorners,
  type PlanPoint,
} from "@/lib/pool-plan";

const VIEW_W = 300;
const VIEW_H = 310;
const PAD = { l: 12, r: 12, t: 52, b: 42 };
const PAPER = "#f4efe4";
const INK = "#1c1915";
const INK_SOFT = "#5e584e";
const CORAL = "#c44736";

const FONT = "var(--font-plex), ui-monospace, monospace";

function seaPath(y: number, x0: number, x1: number, phase: number): string {
  const steps = 16;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = x0 + (x1 - x0) * u;
    const wave = Math.sin(u * Math.PI * 2 + phase) * 1.5;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${(y + wave).toFixed(1)}`;
  }
  return d;
}

function PlanDrawing({ travel }: { travel: number | null }) {
  const layout = planLayout(VIEW_W, VIEW_H, PAD);
  const corners = poolPlanCorners();
  const nw = planProject(corners.nw, layout);
  const ne = planProject(corners.ne, layout);
  const se = planProject(corners.se, layout);
  const sw = planProject(corners.sw, layout);
  const mid = planProject(poolPlanCentroid(), layout);
  const wall = 6;
  const inw = { x: nw.x, y: nw.y + wall };
  const ine = { x: ne.x, y: ne.y + wall };
  const label = (point: PlanPoint) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

  return (
    <svg
      className="plan-svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label="Schematic plan of the tidal pool, north up. The sea and the wall are to the north. The beach and the cliff are to the south. The seaward side is narrower."
    >
      <rect width={VIEW_W} height={VIEW_H} fill={PAPER} />
      <text x={VIEW_W / 2} y={14} textAnchor="middle" fill={INK} fontSize="13" fontFamily={FONT}>
        N
      </text>
      <line x1={VIEW_W / 2} x2={VIEW_W / 2} y1={17} y2={22} stroke={INK} strokeWidth="1" />
      <text x={VIEW_W / 2} y={nw.y - 18} textAnchor="middle" fill={INK} fontSize="14" fontFamily={FONT} letterSpacing="0.12em">
        sea
      </text>
      <path d={seaPath(nw.y - 10, nw.x - 4, ne.x + 4, 0.4)} fill="none" stroke={INK} strokeWidth="1.15" opacity="0.55" />
      <path d={seaPath(nw.y - 5, nw.x + 8, ne.x - 6, 1.7)} fill="none" stroke={INK} strokeWidth="1" opacity="0.4" />
      <path
        d={`M ${label(nw)} L ${label(ne)} L ${label(ine)} L ${label(inw)} Z`}
        fill={PAPER}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <text x={(inw.x + ine.x) / 2} y={inw.y + 14} textAnchor="middle" fill={INK} fontSize="13" fontFamily={FONT} letterSpacing="0.14em">
        wall
      </text>
      <path
        d={`M ${label(sw)} L ${label(inw)} M ${label(se)} L ${label(ine)}`}
        fill="none"
        stroke={INK}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d={`M ${label(sw)} L ${label(se)}`} fill="none" stroke={INK} strokeWidth="1.15" opacity="0.8" />
      <path
        d={`M ${sw.x + 18} ${sw.y + 10} Q ${(sw.x + se.x) / 2} ${sw.y + 16} ${se.x - 18} ${sw.y + 10}`}
        fill="none"
        stroke={INK}
        strokeWidth="1"
        opacity="0.35"
      />
      <text x={VIEW_W / 2} y={sw.y + 18} textAnchor="middle" fill={INK} fontSize="14" fontFamily={FONT} letterSpacing="0.12em">
        beach
      </text>
      <text x={VIEW_W / 2} y={sw.y + 32} textAnchor="middle" fill={INK_SOFT} fontSize="11" fontFamily={FONT} letterSpacing="0.12em">
        cliff
      </text>
      {travel != null ? (
        <g transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)}) rotate(${travel})`}>
          <path d="M0 26 V-10" fill="none" stroke={CORAL} strokeWidth="1.8" />
          <path d="M0 -22 L-6.5 -8 H6.5 Z" fill={CORAL} />
        </g>
      ) : null}
    </svg>
  );
}

export function PlanView({ wind }: { wind: WindFrame | null }) {
  const travel = wind?.hasDirection ? downwindDegrees(wind.directionDeg) : null;
  const towards = travel == null ? null : compassFromDegrees(travel).word;
  return (
    <figure
      className="plan-card"
      data-wind-from={wind?.hasDirection ? wind.compass : undefined}
      data-wind-ms={wind ? wind.avgMs : undefined}
      data-wind-travel={travel ?? undefined}
    >
      <PlanDrawing travel={travel} />
      <figcaption className="plan-copy">
        <p className="plan-orient">North is the sea and the wall. South is the beach.</p>
        {wind ? (
          <>
            {wind.hasDirection ? (
              <>
                <p className="wind-from">from the {wind.word}</p>
                <p className="wind-towards">towards the {towards}</p>
              </>
            ) : (
              <p className="wind-from">direction unknown</p>
            )}
            <p className="wind-nums wind-avg">
              {wind.avgMs} m/s · {wind.periodPhrase}
              {wind.stale ? " · saved" : ""}
            </p>
            {wind.gustMs ? <p className="wind-nums">gusts {wind.gustMs} m/s</p> : null}
            <p className="wind-cliff">{wind.cliff}</p>
          </>
        ) : (
          <p className="wind-from">Wind quiet</p>
        )}
        <p className="plan-note">
          Schematic. <a href={LINKS.listing}>Listing</a> lengths, not a survey — about 91 m on the wall, 168 m at the beach.
        </p>
      </figcaption>
    </figure>
  );
}
