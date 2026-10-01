import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WALL } from "./constants.ts";
import {
  LISTING_PLAN,
  LOCAL_ORIGIN,
  MARGATE_CD_OFFSET_M,
  WORKING_WALL,
  heightCdFromOdn,
  keyPoints,
  localFromOsgb,
  poolDepthM,
  poolOutline,
  wallPlanPolyline,
} from "./geography.ts";

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test("Margate chart datum sits 2.50 m under Ordnance Datum", () => {
  assert.equal(MARGATE_CD_OFFSET_M, 2.5);
  assert.equal(heightCdFromOdn(1), 3.5);
  assert.equal(heightCdFromOdn(0), 2.5);
});

test("the working crest is 3.5 m and the overflow stays six inches under it", () => {
  assert.equal(WORKING_WALL.crestMetresCD, 3.5);
  assert.equal(WORKING_WALL.crestUncertaintyM, 0.2);
  assert.equal(WORKING_WALL.overflowMetresCD, 3.35);
  assert.ok(Math.abs(WORKING_WALL.crestMetresCD - WORKING_WALL.overflowMetresCD - 0.15) < 1e-9);
  assert.equal(DEFAULT_WALL.wallTopMetresCD, 3.5);
  assert.equal(DEFAULT_WALL.overflowMetresCD, 3.35);
  assert.equal(DEFAULT_WALL.waterfallWindowMinutes, 15);
  assert.equal(WORKING_WALL.wallAboveChalkM, 2.1);
});

test("the local frame is east, north, and up from the seaward crest", () => {
  assert.equal(LOCAL_ORIGIN.osgbE, 636910);
  assert.equal(LOCAL_ORIGIN.osgbN, 171595);
  const pin = localFromOsgb(636920, 171510, null);
  assert.ok(Math.abs(pin.x - 10) < 1e-9);
  assert.ok(Math.abs(pin.y - -85) < 1e-9);
  const crest = keyPoints().find((point) => point.id === "seaward-crest");
  assert.ok(crest);
  assert.equal(crest.x, 0);
  assert.equal(crest.y, 0);
  assert.equal(crest.z, 3.5);
});

test("the wall polyline is a U, open at the beach, at the working crest", () => {
  const [sw, nw, ne, se] = wallPlanPolyline();
  assert.equal(wallPlanPolyline().length, 4);
  assert.ok(Math.abs(dist(nw, ne) - LISTING_PLAN.seawardM) < 1e-6);
  assert.ok(Math.abs(dist(sw, se) - LISTING_PLAN.landwardM) < 1e-6);
  assert.ok(Math.abs(dist(sw, nw) - LISTING_PLAN.sideM) < 1e-6);
  assert.ok(Math.abs(dist(se, ne) - LISTING_PLAN.sideM) < 1e-6);
  assert.ok(dist(nw, ne) < dist(sw, se));
  assert.equal(nw.y, 0);
  assert.equal(ne.y, 0);
  assert.ok(sw.y < 0 && se.y < 0);
  assert.equal(sw.z, 3.5);
  assert.equal(nw.z, 3.5);
  const outline = poolOutline();
  assert.equal(outline.length, 4);
  assert.ok(Math.abs(poolDepthM() + sw.y) < 1e-6);
});
