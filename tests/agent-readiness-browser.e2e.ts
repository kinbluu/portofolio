import assert from "node:assert/strict";
import { launchIsolatedAgentBrowser } from "./agent-browser";
import { startBrowserProxy } from "./browser-proxy";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const noScript = await launchIsolatedAgentBrowser({ javascriptEnabled: false });
try {
  const page = await noScript.newPage();
  for (const width of [375, 1280]) {
    await page.setViewport({ width, height: 800 });
    for (const path of ["/", "/about", "/contact", "/privacy"]) {
      await page.goto(new URL(path, base).href);
      const result = await page.evaluate(() => {
        const main = document.querySelector("main");
        const heading = main?.querySelector("h1");
        return {
          text: main?.innerText.length ?? 0,
          headings: main?.querySelectorAll("h1").length,
          visible:
            !!heading &&
            heading.getBoundingClientRect().height > 0 &&
            getComputedStyle(heading).opacity !== "0",
          overflow: document.documentElement.scrollWidth > innerWidth,
          hydrated: !!customElements.get("github-calendar-fallback"),
          privacyLink: !!document.querySelector('a[href="/privacy"]'),
        };
      });
      assert.ok(result.text >= 500, `${path}: main content without JavaScript`);
      assert.equal(result.headings, 1);
      assert.ok(result.visible);
      assert.equal(result.overflow, false, `${path}: ${width}px overflow`);
      assert.equal(result.hydrated, false, "JavaScript must remain disabled");
      assert.ok(result.privacyLink);
    }
  }
} finally {
  await noScript.disconnect();
}

const proxy = await startBrowserProxy(base, (request, response) => {
  if (!request.url?.startsWith("/_server-islands/")) return false;
  response.writeHead(503).end();
  return true;
});
const browser = await launchIsolatedAgentBrowser();
try {
  const page = await browser.newPage();
  await page.goto(proxy.url);
  await page.waitForFunction(
    () => !!document.querySelector("[data-github-loading]:not([hidden])"),
  );
  const grids = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-skeleton-days]")].map(
      (grid) => ({
        expected: grid.dataset.skeletonDays?.length,
        actual: grid.children.length,
        cells: grid.querySelectorAll('[data-slot="skeleton"]').length,
        expectedCells: [...(grid.dataset.skeletonDays ?? "")].filter(
          (day) => day === "1",
        ).length,
        templates: grid.querySelectorAll("template").length,
      }),
    ),
  );
  assert.equal(grids.length, 2);
  for (const grid of grids) {
    assert.equal(grid.actual, grid.expected);
    assert.equal(grid.cells, grid.expectedCells);
    assert.equal(grid.templates, 0);
  }
  await page.waitForFunction(
    () =>
      !document.querySelector("[data-github-loading]") &&
      !!document.querySelector("[data-github-error]:not([hidden])"),
    { timeout: 16000 },
  );
  assert.match(
    (await page.$eval("[data-github-error] a", (link) =>
      link.getAttribute("href"),
    )) ?? "",
    /^https:\/\/github\.com\//,
  );
} finally {
  await browser.disconnect();
  await proxy.close();
}
console.log(
  "PASS no-JavaScript content at 375px and 1280px; identical hydrated skeleton cells and timeout recovery",
);
