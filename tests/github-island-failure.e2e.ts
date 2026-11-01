// Run with the dev server running: bun tests/run-desktop.ts github-island-failure.e2e.ts
// Checks recovery after an island request fails.
import assert from "node:assert/strict";
import { connectAgentBrowser } from "./agent-browser";
import { startBrowserProxy } from "./browser-proxy";

await verifyGitHubIsland();

async function verifyGitHubIsland() {
  const browser = await connectAgentBrowser();
  try {
    const page = await browser.newPage();
    let failure: "http" | "network" = "http";
    let blocked = 0;
    const proxy = await startBrowserProxy(
      process.env.PORTFOLIO_URL ?? "http://localhost:4321/",
      (request, response) => {
        if (
          !new URL(request.url ?? "/", "http://localhost").pathname.startsWith(
            "/_server-islands/",
          )
        ) {
          return false;
        }
        blocked++;
        if (failure === "network") request.socket.destroy();
        else response.writeHead(503).end();
        return true;
      },
    );
    try {
      for (failure of ["http", "network"] as const) {
        blocked = 0;
        await page.goto(proxy.url, { waitUntil: "domcontentloaded" });
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
            Boolean(
              document.querySelector("[data-github-error]:not([hidden])"),
            ),
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
      await proxy.close();
      await page.close();
    }
  } finally {
    await browser.disconnect();
  }
}
