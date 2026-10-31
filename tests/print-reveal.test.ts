// Run with the dev server running: bun tests/print-reveal.test.ts
// Requires an Obscura CDP server; checks print rules without claiming print rendering.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

await verifyPrintRules();

async function verifyPrintRules() {
  const browser = await puppeteer.connect({
    browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
  });
  const page = await browser.newPage();
  try {
    await page.goto(process.env.PORTFOLIO_URL ?? "http://localhost:4321/", {
      waitUntil: "domcontentloaded",
    });
    const css = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => {
          try {
            return [...sheet.cssRules].map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
        .join("\n"),
    );
    const printRules = css.match(/@media\s+print\s*\{[\s\S]*?\}/g) ?? [];
    const revealRule = printRules.find(
      (rule) =>
        rule.includes("[data-reveal]") && rule.includes("[data-reveal-cells]"),
    );
    assert.ok(
      revealRule,
      "print rule must cover reveal elements and calendar cells",
    );
    assert.match(revealRule, /opacity\s*:\s*1\s*!important/);
    assert.match(revealRule, /translate\s*:\s*none\s*!important/);
    console.log(
      "PASS print CSS rules cover reveal elements and calendar cells",
    );
    console.log("UNVERIFIED: Obscura cannot emulate actual print media");
  } finally {
    await page.close();
    browser.disconnect();
  }
}
