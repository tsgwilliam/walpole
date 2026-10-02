/**
 * Wait for section canvas ink, then save cropped section + plan QA shots.
 * Usage: node scripts/capture-section-qa.mjs [baseUrl]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:43123";
const outDir = path.join(process.cwd(), "qa-screenshots");

async function waitForSectionInk(page, timeoutMs = 20000) {
  await page.waitForSelector("canvas.section-canvas", { timeout: timeoutMs });
  const ok = await page.waitForFunction(
    () => {
      const canvas = document.querySelector("canvas.section-canvas");
      if (!canvas || canvas.width < 8 || canvas.height < 8) return false;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      const { width, height } = canvas;
      const data = ctx.getImageData(0, 0, width, height).data;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4 * 12) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 8) continue;
        if (r < 228 || g < 222 || b < 212) ink += 1;
      }
      return ink > 80;
    },
    { timeout: timeoutMs },
  );
  return ok;
}

async function captureSection(page, url, filename) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForSectionInk(page);
  await page.waitForTimeout(350);
  const canvas = page.locator("canvas.section-canvas");
  await canvas.screenshot({ path: path.join(outDir, filename) });
}

async function captureFull(page, url, filename) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForSectionInk(page);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(outDir, filename), fullPage: false });
}

async function capturePlan(page, url, filename) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForSectionInk(page);
  const strokes = await page.locator(".plan-chop-lines path").count();
  if (strokes < 8) throw new Error(`plan chop too thin: ${strokes} strokes`);
  const near = await page.locator(".wind-speed-label").count();
  if (near < 1) throw new Error("wind speed label missing");
  await page.locator(".plan-svg").screenshot({ path: path.join(outDir, filename) });
  return strokes;
}

/** Wall column is solid ink, wash sits above the crest, and the body is not a hollow frame. */
async function assertSeaWall(page) {
  const report = await page.evaluate(() => {
    const canvas = document.querySelector("canvas.section-canvas");
    if (!canvas) return { ok: false, reason: "no canvas" };
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const darkAt = (x, y) => {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      return r < 70 && g < 70 && b < 70;
    };
    const paperAt = (x, y) => {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      return r > 210 && g > 205 && b > 190;
    };
    const cols = [];
    for (let x = 2; x < width - 2; x++) {
      let run = 0;
      let y0 = 0;
      let bestRun = 0;
      let by0 = 0;
      let by1 = 0;
      for (let y = 0; y < height; y++) {
        if (darkAt(x, y)) {
          if (run === 0) y0 = y;
          run += 1;
          if (run > bestRun) {
            bestRun = run;
            by0 = y0;
            by1 = y;
          }
        } else run = 0;
      }
      if (bestRun > height * 0.35) cols.push({ x, y0: by0, y1: by1, run: bestRun });
    }
    if (cols.length < 4) return { ok: false, reason: "no solid wall column", cols: cols.length };
    const wall = cols[Math.floor(cols.length / 2)];
    let paper = 0;
    let dark = 0;
    for (let y = wall.y0 + 3; y <= wall.y1 - 3; y++) {
      if (paperAt(wall.x, y)) paper += 1;
      if (darkAt(wall.x, y)) dark += 1;
    }
    let wash = 0;
    const above0 = Math.max(0, wall.y0 - 22);
    const crestBand = wall.y0 + 3;
    const x0 = cols[Math.floor(cols.length * 0.25)].x;
    const x1 = cols[Math.floor(cols.length * 0.75)].x;
    for (let y = above0; y <= crestBand; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * width + x) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < 220) wash += 1;
      }
    }
    const xL = cols[0].x;
    const xR = cols[cols.length - 1].x;
    let maxPaperRun = 0;
    let run = 0;
    for (let y = wall.y0 - 1; y >= Math.max(0, wall.y0 - 40); y--) {
      let ink = false;
      for (let x = xL; x <= xR; x++) {
        if (darkAt(x, y)) ink = true;
      }
      if (!ink) run += 1;
      else {
        maxPaperRun = Math.max(maxPaperRun, run);
        run = 0;
      }
    }
    const hollow = paper > 2 || dark < (wall.y1 - wall.y0) * 0.7;
    const gapOk = maxPaperRun <= 5;
    return {
      ok: !hollow && wash >= 6 && gapOk,
      reason: hollow
        ? "hollow wall"
        : !gapOk
          ? `paper gap above crest (${maxPaperRun}px run)`
          : wash >= 6
            ? "ok"
            : "no wash over crest",
      maxPaperRun,
      wall,
      span: cols.length,
      paper,
      dark,
      wash,
    };
  });
  if (!report.ok) throw new Error(`sea wall check failed: ${JSON.stringify(report)}`);
  return report;
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

await captureSection(page, `${base}/?demo=storm&mode=sea`, "section-sea-wash.png");
const wall = await assertSeaWall(page);
await captureSection(page, `${base}/?mode=pool`, "section-beach-slope.png");
await captureFull(page, `${base}/?wind=90,10,14&mode=pool`, "wind-90.png");
const light = await capturePlan(page, `${base}/?demo=storm&mode=sea&wind=225,3.2,4.8`, "plan-sparse-chop.png");
const gale = await capturePlan(page, `${base}/?wind=90,10,14&mode=pool`, "plan-wind-90.png");
const wallLee = await capturePlan(page, `${base}/?demo=storm&mode=pool&wind=0,8,10`, "plan-shelter-wall-north.png");
const cliffLee = await capturePlan(page, `${base}/?demo=storm&mode=pool&wind=180,8,10`, "plan-shelter-cliff-south.png");
await captureSection(page, `${base}/?demo=storm&mode=pool`, "section-pool-mode.png");

await browser.close();
console.log(
  `Wrote section-sea-wash.png, section-beach-slope.png, section-pool-mode.png, wind-90.png, plan-sparse-chop.png (${light} strokes), plan-wind-90.png (${gale} strokes), plan-shelter-wall-north.png (${wallLee} strokes), plan-shelter-cliff-south.png (${cliffLee} strokes)`,
);
console.log("sea wall", JSON.stringify(wall));
