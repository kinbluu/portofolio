import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
  protocolTimeout: 30_000,
});
const page = await browser.newPage();

try {
  await page.setViewport({ width: 1024, height: 800 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(process.env.PORTFOLIO_URL ?? "http://localhost:4321/", {
    waitUntil: "domcontentloaded",
  });
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains("lenis"),
    ),
    true,
    "Lenis must start when motion is allowed",
  );

  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("lenis"),
    { timeout: 5_000 },
  );
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains("lenis"),
    ),
    false,
    "reduced motion must restore native scrolling",
  );

  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.waitForFunction(
    () => document.documentElement.classList.contains("lenis"),
    { timeout: 5_000 },
  );
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains("lenis"),
    ),
    false,
    "pagehide must clean up the scroll instance",
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  assert.equal(
    await page.evaluate(() =>
      document.documentElement.classList.contains("lenis"),
    ),
    false,
    "restoring a page must respect the current motion preference",
  );
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.waitForFunction(
    () => document.documentElement.classList.contains("lenis"),
    { timeout: 5_000 },
  );
  console.log("PASS Lenis initialization, reduced motion and page lifecycle");
} finally {
  await page.close();
  browser.disconnect();
}
