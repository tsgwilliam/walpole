import assert from "node:assert/strict";
import test from "node:test";
import { windGlyphLengths, windGlyphMark, windInk } from "./wind-glyph.ts";

function channels(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

test("the mean shaft grows with speed and stays capped", () => {
  const light = windGlyphLengths(2, null);
  const fresh = windGlyphLengths(10, null);
  const gale = windGlyphLengths(40, null);
  assert.ok(fresh.mean > light.mean);
  assert.equal(fresh.gust, fresh.mean);
  assert.equal(light.gust, light.mean);
  assert.ok(gale.mean <= 46);
  assert.equal(gale.gust, gale.mean);
});

test("a stronger gust reaches past the mean", () => {
  const mark = windGlyphLengths(8, 15);
  assert.ok(mark.gust > mark.mean + 7);
  assert.ok(mark.gust <= 58);
  const matched = windGlyphLengths(8, 8);
  assert.equal(matched.gust, matched.mean);
  const under = windGlyphLengths(8, 7);
  assert.equal(under.gust, under.mean);
});

test("the shaft keeps growing through a gale, then sits on the cap", () => {
  const calm = windGlyphLengths(1.5, 2.2);
  const fresh = windGlyphLengths(8, 11);
  const gale = windGlyphLengths(18, 27);
  assert.ok(calm.mean < fresh.mean);
  assert.ok(fresh.mean < gale.mean);
  assert.ok(gale.gust > gale.mean);
  assert.ok(gale.mean < 46);
});

test("colour and thickness warm and thicken with the wind", () => {
  assert.equal(windInk(0), "#5e584e");
  assert.equal(windInk(16), "#c44736");
  const calm = windGlyphMark(1.5, 2.2);
  const fresh = windGlyphMark(8, 12);
  const gale = windGlyphMark(18, 28);
  assert.ok(calm.meanWidth < fresh.meanWidth && fresh.meanWidth < gale.meanWidth);
  assert.ok(calm.head < gale.head);
  assert.ok(gale.gustWidth > calm.gustWidth);
  const [calmRed, calmGreen, calmBlue] = channels(calm.meanColour);
  const [galeRed, galeGreen, galeBlue] = channels(gale.meanColour);
  assert.ok(galeRed > calmRed + 40);
  assert.ok(calmBlue + calmGreen > calmRed);
  assert.ok(galeRed > galeGreen && galeRed > galeBlue);
  assert.notEqual(calm.meanColour, gale.meanColour);
  assert.notEqual(gale.meanColour, gale.gustColour);
});
