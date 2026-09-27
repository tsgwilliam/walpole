import assert from "node:assert/strict";
import test from "node:test";
import { parseLondonCivil } from "./time.ts";
import { MPH_TO_MS, windGlanceLine } from "./wind-line.ts";

test("wind line is metres per second, with a labelled average and gust", () => {
  const line = windGlanceLine({
    compass: "SSW",
    windMph: 13.6,
    windGustMph: 23.3,
    nowIso: "2026-09-27T16:20:00.000Z",
    hourly: [
      { t: parseLondonCivil("2026-09-27T13:00"), windMph: 11.2 },
      { t: parseLondonCivil("2026-09-27T14:00"), windMph: 10.7 },
      { t: parseLondonCivil("2026-09-27T15:00"), windMph: 13.2 },
      { t: parseLondonCivil("2026-09-27T16:00"), windMph: 13.9 },
      { t: parseLondonCivil("2026-09-27T17:00"), windMph: 12.5 },
      { t: parseLondonCivil("2026-09-27T18:00"), windMph: 99 },
    ],
  });
  // 16:20Z is 17:20 London, so 15:00, 16:00, 17:00 London sit in the last three hours.
  const expectedAvg = ((13.2 + 13.9 + 12.5) / 3) * MPH_TO_MS;
  assert.match(line, /^SSW · \d+\.\d m\/s 3-hour avg · gust \d+\.\d m\/s$/);
  assert.ok(line.startsWith(`SSW · ${expectedAvg.toFixed(1)} m/s 3-hour avg`));
  assert.ok(line.includes(`gust ${(23.3 * MPH_TO_MS).toFixed(1)} m/s`));
  assert.equal(line.includes("kt"), false);
  assert.equal(line.includes("mph"), false);
});
