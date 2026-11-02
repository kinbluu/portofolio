// Run with the dev server running: bun tests/run-desktop.ts print-reveal.e2e.ts
// Checks print rules without claiming print rendering.
import assert from "node:assert/strict";
import { connectAgentBrowser } from "./agent-browser";

await verifyPrintRules();

async function verifyPrintRules() {
  const browser = await connectAgentBrowser();
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
    console.log("UNVERIFIED: actual print media rendering");
  } finally {
    await page.close();
    await browser.disconnect();
  }
}
