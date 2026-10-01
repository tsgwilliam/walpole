import assert from "node:assert/strict";
import test from "node:test";
import { chopLabel, classifyChop, cliffTemperLine, MPH_TO_KT } from "./chop.ts";

const thresholds = { lightKt: 10, strongKt: 18 };

function at(mph: number, compass: string) {
  return classifyChop({ windMph: mph, compass, ...thresholds });
}

/** Knots → mph so the tests speak in the threshold units. */
function mph(knots: number) {
  return knots / MPH_TO_KT;
}

test("a light breeze is bathwater, and a bit more is the odd splash", () => {
  assert.equal(at(mph(4), "N").level, 1);
  assert.equal(at(mph(4), "S").level, 1);
  assert.equal(at(mph(7), "NE").level, 2);
  assert.equal(at(mph(9.9), "E").level, 2);
  assert.equal(chopLabel(1), "still as bathwater");
  assert.equal(chopLabel(2), "the odd splash");
});

test("the middle bands sit between the two thresholds", () => {
  assert.equal(at(mph(10), "N").level, 3);
  assert.equal(at(mph(12), "N").level, 3);
  assert.equal(at(mph(14), "E").level, 4);
  assert.equal(at(mph(17), "W").level, 4);
  assert.equal(chopLabel(3), "you gonna be spitting water");
  assert.equal(chopLabel(4), "face splashin a plenty");
});

test("a southerly steps down one, and a strong northerly is the wave machine", () => {
  assert.equal(at(mph(7), "SSW").level, 1);
  assert.equal(at(mph(12), "SW").level, 2);
  assert.equal(at(mph(17), "S").level, 3);
  assert.equal(at(mph(20), "N").level, 5);
  assert.equal(at(mph(22), "NE").level, 5);
  assert.equal(at(mph(21), "WNW").level, 5);
  assert.equal(at(mph(18), "N").level, 5);
  assert.equal(at(mph(20), "E").level, 4);
  assert.equal(at(mph(20), "W").level, 4);
  assert.equal(at(mph(24), "S").level, 3);
  assert.equal(at(mph(18), "SW").level, 3);
  assert.equal(chopLabel(5), "wave machine at Center Parks is on");
});

test("captions name the cliff, not a paragraph", () => {
  assert.equal(at(mph(12), "N").caption, "N wind · cliff less help");
  assert.equal(at(mph(12), "SSW").caption, "SSW wind · cliff takes some");
  assert.equal(at(mph(12), "E").caption, "E wind");
});

test("cliff tempering is a direction guess, and cross-shore stays unknown", () => {
  assert.match(cliffTemperLine("SSW"), /southerly/i);
  assert.match(cliffTemperLine("S"), /direction guess/);
  assert.match(cliffTemperLine("N"), /little help/);
  assert.match(cliffTemperLine("ENE"), /direction guess/);
  assert.match(cliffTemperLine("W"), /unknown/);
  assert.match(cliffTemperLine("E"), /unknown/);
  assert.equal(cliffTemperLine(""), "Cliff tempering unknown.");
});

test("broken thresholds fall back to 10 and 18", () => {
  const reading = classifyChop({ windMph: mph(12), compass: "N", lightKt: 20, strongKt: 10 });
  assert.equal(reading.lightKt, 10);
  assert.equal(reading.strongKt, 18);
  assert.equal(reading.level, 3);
});
