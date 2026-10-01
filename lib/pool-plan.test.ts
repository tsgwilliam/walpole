import assert from "node:assert/strict";
import test from "node:test";
import { downwindDegrees, compassFromDegrees } from "./compass.ts";
import {
  POOL_PLAN,
  planLayout,
  planProject,
  poolPlanCentroid,
  poolPlanCorners,
  poolPlanDepthM,
} from "./pool-plan.ts";

test("listing lengths close, narrower at the sea", () => {
  const depth = poolPlanDepthM();
  assert.ok(depth > 100 && depth < POOL_PLAN.sideM);
  assert.ok(POOL_PLAN.seawardM < POOL_PLAN.landwardM);
  const corners = poolPlanCorners();
  assert.equal(corners.ne.y, depth);
  assert.equal(corners.sw.y, 0);
  assert.ok(corners.ne.x - corners.nw.x < corners.se.x - corners.sw.x);
});

test("the centroid sits in the water and north is up on the page", () => {
  const depth = poolPlanDepthM();
  const centroid = poolPlanCentroid();
  assert.equal(centroid.x, 0);
  assert.ok(centroid.y > depth * 0.3 && centroid.y < depth * 0.6);
  const layout = planLayout(480, 412, { l: 28, r: 28, t: 58, b: 46 });
  const corners = poolPlanCorners();
  const nw = planProject(corners.nw, layout);
  const ne = planProject(corners.ne, layout);
  const sw = planProject(corners.sw, layout);
  const se = planProject(corners.se, layout);
  assert.ok(nw.y < sw.y);
  assert.ok(ne.y < se.y);
  assert.ok(Math.abs(ne.x - nw.x) < Math.abs(se.x - sw.x) - 1);
  const mid = planProject(centroid, layout);
  assert.ok(mid.y > nw.y && mid.y < sw.y);
  assert.ok(mid.x > sw.x && mid.x < se.x);
});

test("a southerly on the plan travels towards the sea", () => {
  const travel = downwindDegrees(202.5);
  assert.equal(compassFromDegrees(travel).short, "NNE");
  assert.ok(travel < 90);
});
