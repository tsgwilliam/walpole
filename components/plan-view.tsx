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
import { QUIET_LABEL, polygonCentroid, quieterZone, type QuietZone } from "@/lib/shelter";
import { windGlyphLengths } from "@/lib/wind-glyph";

const VIEW_W = 300;
const VIEW_H = 332;
const PAD = { l: 14, r: 14, t: 64, b: 52 };
const PAPER = "#f4efe4";
const INK = "#1c1915";
const INK_SOFT = "#5e584e";
const CORAL = "#c44736";
const WATER = "#2f74a3";

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

function pathOf(points: PlanPoint[]): string {
  return points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function QuietPatch({ zone, layout }: { zone: QuietZone; layout: ReturnType<typeof planLayout> }) {
  const projected = zone.polygon.map((point) => planProject(point, layout));
  const d = `${pathOf(projected)} Z`;
  return (
    <g className="quiet-zone" data-quiet={zone.whole ? "whole" : "lee"}>
      <path d={d} fill={INK} opacity={0.09} />
      <path d={d} fill="url(#quiet-hatch)" />
    </g>
  );
}

function WindGlyph({
  at,
  travel,
  avgMs,
  gustMs,
}: {
  at: PlanPoint;
  travel: number;
  avgMs: number;
  gustMs: number | null;
}) {
  const { mean, gust } = windGlyphLengths(avgMs, gustMs);
  const tail = mean * 0.45;
  const tip = tail - mean;
  const gustTip = tip - (gust - mean);
  const head = 8;
  const showGust = gust > mean + 0.5;
  return (
    <g
      className="wind-glyph"
      data-wind-mean-px={mean.toFixed(1)}
      data-wind-gust-px={gust.toFixed(1)}
      transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${travel})`}
    >
      {showGust ? (
        <g className="wind-gust-mark">
          <line x1={0} y1={tail} x2={0} y2={gustTip + 6} stroke={CORAL} strokeWidth={1.15} />
          <path
            d={`M ${-4.4} ${(gustTip + 7).toFixed(1)} L 0 ${gustTip.toFixed(1)} L ${4.4} ${(gustTip + 7).toFixed(1)}`}
            fill="none"
            stroke={CORAL}
            strokeWidth={1.15}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ) : null}
      <line x1={0} y1={tail} x2={0} y2={tip + head * 0.55} stroke={CORAL} strokeWidth={2.15} strokeLinecap="round" />
      <path d={`M 0 ${tip.toFixed(1)} L ${-5.4} ${(tip + head).toFixed(1)} H ${5.4} Z`} fill={CORAL} />
    </g>
  );
}

function PlanDrawing({
  travel,
  avgMs,
  gustMs,
  submerged,
  zone,
}: {
  travel: number | null;
  avgMs: number | null;
  gustMs: number | null;
  submerged: boolean;
  zone: QuietZone | null;
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
  const quietAt = zone
    ? planProject(polygonCentroid(zone.polygon), layout)
    : null;
  const quietLabel =
    quietAt == null
      ? null
      : {
          x: quietAt.x,
          y:
            Math.hypot(quietAt.x - mid.x, quietAt.y - mid.y) < 26
              ? Math.min(sw.y - 18, quietAt.y + 34)
              : quietAt.y,
        };

  const aria = [
    "Schematic plan of the tidal pool, north up. The sea is to the north. Side walls and the seaward wall make a U. The beach and the cliff are to the south.",
    submerged ? "The wall is under the water." : "The wall crest is showing.",
    zone ? "A hatched patch is a rough guess at quieter water." : "",
    travel != null ? "The arrow points the way the wind is blowing. The solid shaft is the average and the lighter shaft is the gust." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg className="plan-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={aria}>
      <defs>
        <pattern id="quiet-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(36)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={INK} strokeWidth="1" opacity="0.55" />
        </pattern>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill={PAPER} />
      <text x={VIEW_W / 2} y={16} textAnchor="middle" fill={INK} fontSize="13" fontFamily={FONT}>
        N
      </text>
      <line x1={VIEW_W / 2} x2={VIEW_W / 2} y1={19} y2={24} stroke={INK} strokeWidth="1" />
      <text
        x={VIEW_W / 2}
        y={nw.y - 24}
        textAnchor="middle"
        fill={INK}
        fontSize="14"
        fontFamily={FONT}
        letterSpacing="0.12em"
      >
        sea
      </text>
      <path d={seaPath(nw.y - 14, nw.x - 4, ne.x + 4, 0.4)} fill="none" stroke={INK} strokeWidth="1.15" opacity="0.55" />
      <path d={seaPath(nw.y - 8, nw.x + 8, ne.x - 6, 1.7)} fill="none" stroke={INK} strokeWidth="1" opacity="0.4" />
      {submerged ? (
        <path
          className="wall-wash"
          d={`M ${label(sw)} L ${label(nw)} L ${nw.x.toFixed(1)} ${(nw.y - 10).toFixed(1)} L ${ne.x.toFixed(1)} ${(ne.y - 10).toFixed(1)} L ${label(ne)} L ${label(se)} Z`}
          fill={WATER}
          opacity={0.2}
        />
      ) : null}
      {zone ? <QuietPatch zone={zone} layout={layout} /> : null}
      <path
        className="plan-wall"
        data-wall={submerged ? "under" : "solid"}
        d={wall}
        fill="none"
        stroke={INK}
        strokeWidth={submerged ? 4.2 : 6.2}
        strokeLinejoin="round"
        strokeLinecap="butt"
        strokeDasharray={submerged ? "6 4.5" : undefined}
        opacity={submerged ? 0.55 : 1}
      />
      <path d={`M ${label(sw)} L ${label(se)}`} fill="none" stroke={INK} strokeWidth="1.15" opacity="0.8" />
      <text
        x={(nw.x + ne.x) / 2}
        y={(nw.y + ne.y) / 2 + 16}
        textAnchor="middle"
        fill={submerged ? INK_SOFT : INK}
        fontSize="13"
        fontFamily={FONT}
        letterSpacing="0.08em"
        stroke={PAPER}
        strokeWidth="3"
        paintOrder="stroke"
      >
        {submerged ? "wall under" : "wall"}
      </text>
      {quietLabel ? (
        <text
          className="quiet-label"
          x={quietLabel.x}
          y={quietLabel.y}
          textAnchor="middle"
          fill={INK_SOFT}
          fontSize="11"
          fontFamily={FONT}
          stroke={PAPER}
          strokeWidth="3"
          paintOrder="stroke"
        >
          {QUIET_LABEL}
        </text>
      ) : null}
      <text x={VIEW_W / 2} y={sw.y + 20} textAnchor="middle" fill={INK} fontSize="14" fontFamily={FONT} letterSpacing="0.12em">
        beach
      </text>
      <text x={VIEW_W / 2} y={sw.y + 36} textAnchor="middle" fill={INK_SOFT} fontSize="11" fontFamily={FONT} letterSpacing="0.12em">
        cliff
      </text>
      {travel != null && avgMs != null ? (
        <WindGlyph at={mid} travel={travel} avgMs={avgMs} gustMs={gustMs} />
      ) : null}
    </svg>
  );
}

export function PlanView({ wind, submerged }: { wind: WindFrame | null; submerged: boolean }) {
  const travel = wind?.hasDirection ? downwindDegrees(wind.directionDeg) : null;
  const towards = travel == null ? null : compassFromDegrees(travel).word;
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
    >
      <PlanDrawing
        travel={travel}
        avgMs={avgMs != null && Number.isFinite(avgMs) ? avgMs : null}
        gustMs={gustMs != null && Number.isFinite(gustMs) ? gustMs : null}
        submerged={submerged}
        zone={zone}
      />
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
            {wind.gustMs ? <p className="wind-nums wind-gust">gusts {wind.gustMs} m/s</p> : null}
            <p className="wind-cliff">{wind.cliff}</p>
          </>
        ) : (
          <p className="wind-from">Wind quiet</p>
        )}
        <p className="plan-note">
          Schematic. <a href={LINKS.listing}>Listing</a> lengths, not a survey — about 91 m on the wall, 168 m at the beach.
          The side walls close the east and the west.
        </p>
      </figcaption>
    </figure>
  );
}
