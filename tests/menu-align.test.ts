// Run (dev server up): bun tests/menu-align.test.ts
// Env: URL (default http://localhost:4321/), CHROME (default /usr/bin/chromium)
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();

const center = (selector: string) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel)!.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, selector);

for (const [width, scrollY, pointer] of [
  [390, 0, false],
  [390, 600, false],
  [390, 600, true], // active:scale-90 shrinks rect while pressed
  [768, 0, false],
  [768, 600, true],
] as const) {
  const label = `${width}px scroll=${scrollY} pointer=${pointer}`;
  await page.setViewport({ width, height: 800 });
  await page.goto(process.env.URL ?? "http://localhost:4321/");
  await page.evaluate((y) => scrollTo(0, y), scrollY);
  await page.waitForFunction((y) => Math.round(scrollY) === y, {}, scrollY);
  const [bx, by] = await center("[data-menu-open] svg");
  if (pointer) {
    await page.mouse.move(bx, by);
    await page.mouse.down();
    await page.mouse.up();
  } else {
    await page.click("[data-menu-open]");
  }
  await page.waitForSelector("#site-menu[open]");
  const [ax, ay] = await center("[data-menu-close] svg");
  assert.ok(
    Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) < 0.5,
    `${label}: open (${bx},${by}) vs close (${ax},${ay})`,
  );
}

await browser.close();
console.log("PASS menu icon alignment");
