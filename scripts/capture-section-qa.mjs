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

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

await captureSection(page, `${base}/?demo=storm&mode=sea`, "section-sea-wash.png");
await captureSection(page, `${base}/?mode=pool`, "section-beach-slope.png");
await captureFull(page, `${base}/?wind=90,10,14&mode=pool`, "wind-90.png");

await browser.close();
console.log("Wrote section-sea-wash.png, section-beach-slope.png, wind-90.png");
