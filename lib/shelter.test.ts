import assert from "node:assert/strict";
import test from "node:test";
import { poolDepthM, poolOutline } from "./geography.ts";
import {
  graduatedShelterMultiplier,
  planCalmBandFraction,
  planUpwindFraction,
  polygonArea,
  quieterZone,
  QUIET_MAX_AREA_FRAC,
  QUIET_LABEL,
} from "./shelter.ts";

test("graduated shelter is calm upwind and ramps to full chop downwind", () => {
  const north = { fromDeg: 0, compass: "N", wallShelters: true };
  const wall = { x: 0, y: poolOutline()[0].y };
  const beach = { x: 0, y: poolOutline()[2].y };
  const calmWall = graduatedShelterMultiplier(wall, north, 6);
  const openBeach = graduatedShelterMultiplier(beach, north, 6);
  assert.ok(calmWall < openBeach);
  assert.ok(calmWall <= 0.08);
  assert.equal(openBeach, 1);
  assert.ok(planCalmBandFraction(0, true) === 0.1);
  assert.equal(planCalmBandFraction(0, false), 0);
  assert.equal(planCalmBandFraction(180, true), 0.3);
  assert.ok(planUpwindFraction(wall, 0) < planUpwindFraction(beach, 0));
});

test("the quiet label says it is a rough guess", () => {
  assert.equal(QUIET_LABEL, "quieter (rough guess)");
});

test("calm wind marks the whole pool quiet", () => {
  const zone = quieterZone({ fromDeg: 180, speedMs: 1.2, gustMs: 2, compass: "S" });
  assert.ok(zone);
  assert.equal(zone.whole, true);
  assert.equal(zone.fraction, 1);
  assert.equal(zone.polygon.length, 4);
});

test("a strong southerly leaves quiet water toward the beach, and a stronger wind shrinks it", () => {
  const poolArea = polygonArea(poolOutline().map((point) => ({ x: point.x, y: point.y })));
  const moderate = quieterZone({ fromDeg: 180, speedMs: 6, gustMs: 7, compass: "S" });
  const strong = quieterZone({ fromDeg: 180, speedMs: 14, gustMs: 18, compass: "S" });
  assert.ok(moderate && strong);
  assert.equal(moderate.whole, false);
  assert.equal(strong.whole, false);
  assert.ok(polygonArea(strong.polygon) < polygonArea(moderate.polygon));
  assert.ok(polygonArea(strong.polygon) <= poolArea * QUIET_MAX_AREA_FRAC + 1);

  const south = Math.min(...poolOutline().map((point) => point.y));
  const sea = Math.max(...poolOutline().map((point) => point.y));
  assert.ok(Math.abs(Math.min(...strong.polygon.map((point) => point.y)) - south) < 1);
  assert.ok(Math.max(...strong.polygon.map((point) => point.y)) < sea - 1);
  assert.ok(Math.max(...strong.polygon.map((point) => point.y)) < -poolDepthM() * 0.4);
});

test("a northerly puts the quiet band against the seaward wall", () => {
  const zone = quieterZone({ fromDeg: 0, speedMs: 12, gustMs: 14, compass: "N" });
  assert.ok(zone);
  assert.ok(Math.abs(Math.max(...zone.polygon.map((point) => point.y))) < 1);
  assert.ok(Math.min(...zone.polygon.map((point) => point.y)) > -poolDepthM() + 5);
});

test("the same speed from the south keeps a wider quiet band than from the north", () => {
  const south = quieterZone({ fromDeg: 180, speedMs: 10, gustMs: 10, compass: "S" });
  const north = quieterZone({ fromDeg: 0, speedMs: 10, gustMs: 10, compass: "N" });
  assert.ok(south && north);
  assert.ok(south.fraction > north.fraction);
});

test("an easterly hugs the east side", () => {
  const zone = quieterZone({ fromDeg: 90, speedMs: 12, gustMs: 14, compass: "E" });
  assert.ok(zone);
  const east = Math.max(...poolOutline().map((point) => point.x));
  assert.ok(Math.abs(Math.max(...zone.polygon.map((point) => point.x)) - east) < 1);
  assert.ok(Math.min(...zone.polygon.map((point) => point.x)) > 0);
});

test("no direction and a fresh wind draws no lee", () => {
  assert.equal(quieterZone({ fromDeg: null, speedMs: 8, gustMs: 10, compass: null }), null);
});

test("a gust trims the quiet band", () => {
  const steady = quieterZone({ fromDeg: 90, speedMs: 6, gustMs: 6, compass: "E" });
  const gusty = quieterZone({ fromDeg: 90, speedMs: 6, gustMs: 14, compass: "E" });
  assert.ok(steady && gusty);
  assert.ok(gusty.fraction < steady.fraction);
});
