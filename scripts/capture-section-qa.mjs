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
    let best = null;
    for (let x = 2; x < width - 2; x++) {
      let run = 0;
      let y0 = 0;
      for (let y = 0; y < height; y++) {
        if (darkAt(x, y)) {
          if (run === 0) y0 = y;
          run += 1;
        } else if (run > 0) {
          if (!best || run > best.run) best = { x, y0, y1: y - 1, run };
          run = 0;
        }
      }
      if (run > 0 && (!best || run > best.run)) best = { x, y0, y1: height - 1, run };
    }
    if (!best || best.run < height * 0.25) return { ok: false, reason: "no solid wall column", best };
    const midY = Math.round((best.y0 + best.y1) / 2);
    let paper = 0;
    let dark = 0;
    const x0 = Math.max(0, best.x - 2);
    const x1 = Math.min(width - 1, best.x + 2);
    for (let y = best.y0 + 4; y <= best.y1 - 4; y++) {
      for (let x = x0; x <= x1; x++) {
        if (paperAt(x, y)) paper += 1;
        if (darkAt(x, y)) dark += 1;
      }
    }
    let wash = 0;
    const above0 = Math.max(0, best.y0 - 28);
    for (let y = above0; y < best.y0 - 2; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * width + x) * 4;
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < 190) wash += 1;
      }
    }
    const hollow = paper > dark * 0.35;
    return {
      ok: dark > 20 && !hollow && wash > 4,
      reason: hollow ? "hollow wall" : wash > 4 ? "ok" : "no wash over crest",
      best,
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

await browser.close();
console.log(
  `Wrote section-sea-wash.png, section-beach-slope.png, wind-90.png, plan-sparse-chop.png (${light} strokes), plan-wind-90.png (${gale} strokes)`,
);
console.log("sea wall", JSON.stringify(wall));
