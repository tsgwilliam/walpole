import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_CHOP_ROW_GAP, chopLocalToScreen, planChopInk, roughnessAt } from "./plan-roughness.ts";
import { poolPlanCorners } from "./pool-plan.ts";

test("a light breeze still inks sparse chop, including a sheltered step-down", () => {
  const open = roughnessAt({ x: 0, y: -40 }, 2, null, 3.2);
  const northWind = { fromDeg: 0, compass: "N", wallShelters: true };
  const sheltered = roughnessAt({ x: 0, y: poolPlanCorners().nw.y }, 2, northWind, 3.2);
  const exposed = roughnessAt({ x: 0, y: -40 }, 1, northWind, 3.2);
  assert.ok(open >= 0.22);
  assert.ok(sheltered >= 0.08);
  assert.ok(exposed > sheltered);
  const ink = planChopInk(sheltered);
  assert.ok(ink);
  assert.ok(ink.opacity >= 0.45);
  assert.ok(ink.width >= 1.1);
});

test("bathwater under a calm wind leaves the plan clear", () => {
  assert.equal(roughnessAt({ x: 0, y: -20 }, 1, null, 1.2), 0);
  assert.equal(planChopInk(0), null);
});

test("chop amplitude stays under the row gap so strokes do not braid", () => {
  for (const rough of [0.22, 0.5, 0.75, 1, 1.4]) {
    const ink = planChopInk(rough);
    assert.ok(ink);
    assert.ok(ink.amp * 2 < PLAN_CHOP_ROW_GAP, `amp ${ink.amp} at rough ${rough}`);
  }
});

test("chop-local rotation matches the plan SVG rotate", () => {
  const north = chopLocalToScreen(0, -10, 0);
  assert.ok(Math.abs(north.x) < 1e-9);
  assert.ok(north.y < -9);
  const east = chopLocalToScreen(0, -10, 90);
  assert.ok(east.x > 9);
  assert.ok(Math.abs(east.y) < 1e-6);
});
