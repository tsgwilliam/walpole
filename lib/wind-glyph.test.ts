import assert from "node:assert/strict";
import test from "node:test";
import { windGlyphLengths } from "./wind-glyph.ts";

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
