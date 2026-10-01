import assert from "node:assert/strict";
import test from "node:test";
import { poolDepthM, poolOutline } from "./geography.ts";
import { QUIET_LABEL, polygonArea, quieterZone } from "./shelter.ts";

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
  const moderate = quieterZone({ fromDeg: 180, speedMs: 6, gustMs: 7, compass: "S" });
  const strong = quieterZone({ fromDeg: 180, speedMs: 14, gustMs: 18, compass: "S" });
  assert.ok(moderate && strong);
  assert.equal(moderate.whole, false);
  assert.equal(strong.whole, false);
  assert.ok(polygonArea(strong.polygon) < polygonArea(moderate.polygon));

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
