import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_WALL } from "./constants.ts";
import {
  LISTING_PLAN,
  LOCAL_ORIGIN,
  LOCKED_POINTS,
  MARGATE_CD_OFFSET_M,
  OSM_OUTLINE,
  SEAWARD_CREST_POLYLINE,
  SOFT_BEACH,
  TIDE_LEVELS_CD,
  WORKING_WALL,
  heightCdFromOdn,
  heightOdnFromCd,
  keyPoints,
  localFromOsgb,
  lockedPoint,
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
  assert.equal(heightOdnFromCd(3.5), 1);
  assert.ok(Math.abs(heightOdnFromCd(heightCdFromOdn(0.95)) - 0.95) < 1e-9);
});

test("the working crest is 3.5 m and the overflow stays six inches under it", () => {
  assert.equal(WORKING_WALL.crestMetresCD, 3.5);
  assert.equal(WORKING_WALL.crestMeasuredMeanCD, 3.46);
  assert.equal(WORKING_WALL.crestUncertaintyM, 0.2);
  assert.equal(WORKING_WALL.overflowMetresCD, 3.35);
  assert.ok(Math.abs(WORKING_WALL.crestMetresCD - WORKING_WALL.overflowMetresCD - 0.15) < 1e-9);
  assert.equal(DEFAULT_WALL.wallTopMetresCD, 3.5);
  assert.equal(DEFAULT_WALL.overflowMetresCD, 3.35);
  assert.equal(DEFAULT_WALL.waterfallWindowMinutes, 15);
  assert.equal(WORKING_WALL.wallAboveChalkM, 2.1);
  assert.equal(WORKING_WALL.chalkUncertaintyM, 0.4);
  assert.equal(WORKING_WALL.poolLidarWaterCD, 3.27);
  assert.equal(SOFT_BEACH.grade, 0.12);
  assert.equal(SOFT_BEACH.runM, 35);
  assert.equal(SOFT_BEACH.gradeHigh, 0.15);
});

test("the origin is the locked seaward crest, and local axes match OSGB", () => {
  assert.equal(LOCAL_ORIGIN.osgbE, 636913);
  assert.equal(LOCAL_ORIGIN.osgbN, 171594.5);
  assert.equal(LOCAL_ORIGIN.z, 3.5);
  const origin = localFromOsgb(LOCAL_ORIGIN.osgbE, LOCAL_ORIGIN.osgbN, LOCAL_ORIGIN.z);
  assert.equal(origin.x, 0);
  assert.equal(origin.y, 0);
  assert.equal(origin.z, 3.5);
  for (const point of LOCKED_POINTS) {
    const local = localFromOsgb(point.osgbE, point.osgbN, point.z);
    assert.ok(Math.abs(local.x - point.x) < 1e-6, point.name);
    assert.ok(Math.abs(local.y - point.y) < 1e-6, point.name);
    assert.equal(local.z, point.z);
  }
  const centroid = localFromOsgb(OSM_OUTLINE.centroidE, OSM_OUTLINE.centroidN, null);
  assert.ok(Math.abs(centroid.x - 8) < 1e-9);
  assert.ok(Math.abs(centroid.y - -75) < 1e-9);
});

test("locked points keep the crest, the uncertain chalk, and the tide levels", () => {
  const points = keyPoints();
  const crest = lockedPoint("seaward_wall_crest_centre");
  assert.ok(crest);
  assert.equal(crest.x, 0);
  assert.equal(crest.y, 0);
  assert.equal(crest.z, 3.5);
  assert.equal(points[0].name, crest.name);

  const chalk = lockedPoint("inferred_chalk_floor_seaward");
  assert.ok(chalk);
  assert.equal(chalk.uncertain, true);
  assert.equal(chalk.z, 1.4);
  assert.equal(chalk.y, -30);
  assert.equal(chalk.verticalUncertaintyM, 0.4);

  const water = lockedPoint("pool_lidar_water_surface");
  assert.equal(water?.z, 3.27);
  const foreshore = lockedPoint("foreshore_north_of_crest");
  assert.equal(foreshore?.y, 25);
  assert.equal(foreshore?.z, 0.33);

  assert.equal(lockedPoint("ref_MHWS")?.z, TIDE_LEVELS_CD.MHWS);
  assert.equal(TIDE_LEVELS_CD.MHWS, 4.8);
  assert.equal(TIDE_LEVELS_CD.MHWN, 3.9);
  assert.equal(TIDE_LEVELS_CD.MLWN, 1.4);
  assert.equal(TIDE_LEVELS_CD.MLWS, 0.5);
  assert.equal(TIDE_LEVELS_CD.HAT, 5.1);
  assert.ok(WORKING_WALL.crestMetresCD < TIDE_LEVELS_CD.MHWN);
});

test("the measured seaward crest is the lidar bar, not the listing U", () => {
  const bar = SEAWARD_CREST_POLYLINE;
  assert.equal(bar.length, 12);
  assert.equal(bar[0].x, -51);
  assert.equal(bar[0].z, 3.47);
  assert.equal(bar[bar.length - 1].x, 51);
  assert.equal(bar[bar.length - 1].y, -13);
  const span = dist(bar[0], bar[bar.length - 1]);
  assert.ok(span > LISTING_PLAN.seawardM);
  assert.ok(span < 110);
});

test("the ink wall polyline is a U, open at the beach, at the working crest", () => {
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
