#!/usr/bin/env node
/**
 * Renders the Kuala Lepak social kit from the live game into marketing/social/.
 * Needs the dev server running:  pnpm dev  (then)  node scripts/promo.mjs [base-url] [only]
 *   only: avatar | monogram | wordmark | post-welcome | post-anne | video
 */
import { mkdirSync, appendFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "marketing", "social");
const BASE = process.argv[2] ?? "http://localhost:3212";
const ONLY = process.argv[3];
const BROWSER = process.env.BROWSER_BIN ?? "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: BROWSER,
  headless: true,
  protocolTimeout: 30 * 60_000,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal", "--enable-unsafe-webgpu", "--hide-scrollbars"],
});

async function render(view, { width = 1080, height = 1080, scale = 1, transparent = false, file, timeout = 120_000 }) {
  if (ONLY && ONLY !== view) return;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  page.on("console", (m) => m.type() === "error" && console.log(`  [${view}] ${m.text()}`));
  const mp4 = join(OUT, file.replace(/\.png$/, ".mp4"));
  if (view === "video") {
    if (existsSync(mp4)) rmSync(mp4);
    await page.exposeFunction("__promoSave", (chunk, done) => {
      appendFileSync(mp4, Buffer.from(chunk, "base64"));
      if (done) console.log(`  video bytes written`);
    });
  }
  const t0 = Date.now();
  await page.goto(`${BASE}/promo?view=${view}`, { waitUntil: "networkidle2", timeout: 120_000 });
  await page.evaluate(() => document.fonts.ready);
  if (["avatar", "monogram", "wordmark"].includes(view)) await new Promise((r) => setTimeout(r, 600));
  else await page.waitForFunction(() => window.__promoReady === true, { timeout, polling: 500 });
  if (view !== "video") {
    await page.screenshot({ path: join(OUT, file), omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
    console.log(`wrote marketing/social/${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } else {
    console.log(`wrote marketing/social/${file.replace(/\.png$/, ".mp4")} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
  await page.close();
}

await render("avatar", { file: "kualalepak-avatar.png", scale: 2 });
await render("monogram", { file: "kualalepak-avatar-kl.png", scale: 2 });
await render("wordmark", { file: "kualalepak-wordmark.png", width: 1920, height: 1080, transparent: true, scale: 2 });
await render("post-welcome", { file: "post-1-welcome.png" });
await render("post-anne", { file: "post-2-anne-maju.png" });
await render("video", { file: "intro-video.png", timeout: 25 * 60_000 });
await browser.close();
