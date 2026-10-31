// Run with the dev server running: bun tests/github-island-failure.test.ts
// Requires an Obscura CDP server; checks recovery after an island request fails.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

await verifyGitHubIsland();

async function verifyGitHubIsland() {
  const browser = await puppeteer.connect({
    browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
  });
  const page = await browser.newPage();
  const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:4321/";
  let failure: "http" | "network" = "http";
  let blocked = 0;
  const onRequest = async (request: import("puppeteer-core").HTTPRequest) => {
    if (!new URL(request.url()).pathname.startsWith("/_server-islands/")) {
      await request.continue();
      return;
    }
    blocked++;
    if (failure === "network") await request.abort("failed");
    else await request.respond({ status: 503, body: "" });
  };
  await page.setRequestInterception(true);
  page.on("request", onRequest);
  try {
    for (failure of ["http", "network"] as const) {
      blocked = 0;
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () =>
          Boolean(
            document.querySelector("[data-github-loading]:not([hidden])"),
          ),
        { timeout: 5_000 },
      );
      await page.waitForFunction(
        () =>
          !document.querySelector("[data-github-loading]") &&
          Boolean(document.querySelector("[data-github-error]:not([hidden])")),
        { timeout: 16_000 },
      );
      assert.ok(
        blocked > 0,
        `${failure}: server island request must be intercepted`,
      );
      const href = await page.$eval("[data-github-error] a", (link) =>
        link.getAttribute("href"),
      );
      assert.match(
        href ?? "",
        /^https:\/\/github\.com\/[^/]+$/,
        `${failure}: recovery link must point to GitHub`,
      );
    }
    console.log(
      "PASS GitHub island HTTP and network failures leave loading state",
    );
  } finally {
    page.off("request", onRequest);
    await page.close();
    browser.disconnect();
  }
}
