import assert from "node:assert/strict";
import { connectAgentBrowser } from "./agent-browser";
import { startBrowserProxy } from "./browser-proxy";

const baseUrl = new URL(process.env.PORTFOLIO_URL ?? "http://localhost:4321/");
if (!["localhost", "127.0.0.1", "[::1]"].includes(baseUrl.hostname)) {
  throw new Error("Visitor count E2E tests must use a local server.");
}
const apiUrl = new URL("/api/visitors", baseUrl);

function countLabel(count: number): string {
  return `${new Intl.NumberFormat("en-US").format(count)} ${count === 1 ? "visitor" : "visitors"}`;
}

async function readCount(): Promise<number> {
  const response = await fetch(apiUrl);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const body = (await response.json()) as { count: number };
  assert.ok(Number.isSafeInteger(body.count) && body.count >= 0);
  return body.count;
}

const initialCount = await readCount();
const invalid = await fetch(apiUrl, { method: "POST" });
assert.equal(invalid.status, 400);
const crossOrigin = await fetch(apiUrl, {
  method: "POST",
  headers: {
    Origin: "https://example.org",
    "X-Visitor-Id": crypto.randomUUID(),
  },
});
assert.equal(crossOrigin.status, 403);
assert.equal(await readCount(), initialCount);

const browser = await connectAgentBrowser();

try {
  const noJsContext = await browser.createBrowserContext({
    javascriptEnabled: false,
  });
  const noJs = await noJsContext.newPage();
  await noJs.goto(baseUrl.href, { waitUntil: "domcontentloaded" });
  assert.equal(
    await noJs.javascriptIsDisabled(),
    true,
    "browser JavaScript must be disabled",
  );
  assert.equal(
    await noJs.$eval("[data-visitor-count]", (node) =>
      node.hasAttribute("hidden"),
    ),
    true,
  );
  assert.equal(await readCount(), initialCount);
  await noJsContext.close();

  const firstContext = await browser.createBrowserContext();
  const first = await firstContext.newPage();
  await first.goto(baseUrl.href, { waitUntil: "domcontentloaded" });
  assert.equal(
    await first.javascriptIsDisabled(),
    false,
    "browser JavaScript must be enabled",
  );
  await first.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(await readCount(), initialCount + 1);
  assert.equal(
    await first.$eval("[data-visitor-count]", (node) => node.textContent),
    countLabel(initialCount + 1),
  );
  const savedId = await first.evaluate(() =>
    localStorage.getItem("portfolio-visitor-id"),
  );
  assert.ok(savedId);

  await first.reload({ waitUntil: "domcontentloaded" });
  await first.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(
    await first.evaluate(() => localStorage.getItem("portfolio-visitor-id")),
    savedId,
  );
  assert.equal(await readCount(), initialCount + 1);

  const sameBrowser = await firstContext.newPage();
  await sameBrowser.goto(baseUrl.href, { waitUntil: "domcontentloaded" });
  await sameBrowser.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(await readCount(), initialCount + 1);
  await sameBrowser.close();

  const secondContext = await browser.createBrowserContext();
  const second = await secondContext.newPage();
  await second.goto(baseUrl.href, { waitUntil: "domcontentloaded" });
  await second.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(await readCount(), initialCount + 2);
  assert.equal(
    await second.$eval("[data-visitor-count]", (node) => node.textContent),
    countLabel(initialCount + 2),
  );
  await secondContext.close();

  for (const width of [320, 390, 1440]) {
    await first.setViewport({ width, height: 900 });
    const state = await first.evaluate(() => {
      const counter = document.querySelector<HTMLElement>(
        "[data-visitor-count]",
      );
      return {
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        counter: counter?.textContent,
        inFooter: Boolean(counter?.closest("footer")),
      };
    });
    assert.equal(
      state.scrollWidth,
      state.width,
      `horizontal overflow at ${width}px`,
    );
    assert.match(state.counter ?? "", /^\d[\d,]* visitors?$/);
    assert.equal(state.inFooter, true);
  }

  await first.evaluate(() => localStorage.removeItem("portfolio-visitor-id"));
  await first.reload({ waitUntil: "domcontentloaded" });
  await first.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(await readCount(), initialCount + 3);
  await firstContext.close();

  const blockedContext = await browser.createBrowserContext({
    initScript:
      'Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });',
  });
  const blocked = await blockedContext.newPage();
  await blocked.goto(baseUrl.href, { waitUntil: "domcontentloaded" });
  await blocked.waitForSelector("[data-visitor-count]:not([hidden])");
  assert.equal(await readCount(), initialCount + 3);
  await blockedContext.close();

  const failedContext = await browser.createBrowserContext();
  const failed = await failedContext.newPage();
  let failedRequests = 0;
  const failedProxy = await startBrowserProxy(
    baseUrl.href,
    (request, response) => {
      if (new URL(request.url ?? "/", baseUrl).pathname !== "/api/visitors")
        return false;
      failedRequests++;
      response.writeHead(503).end();
      return true;
    },
  );
  try {
    await failed.goto(failedProxy.url, { waitUntil: "domcontentloaded" });
    await failed.waitForResponse("/api/visitors", 503);
    assert.ok(failedRequests > 0);
    assert.equal(
      await failed.$eval("[data-visitor-count]", (node) =>
        node.hasAttribute("hidden"),
      ),
      true,
    );
    assert.equal(await readCount(), initialCount + 3);
  } finally {
    await failedProxy.close();
  }
  await failedContext.close();

  const concurrentId = crypto.randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      fetch(apiUrl, {
        method: "POST",
        headers: { Origin: baseUrl.origin, "X-Visitor-Id": concurrentId },
      }),
    ),
  );
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(await readCount(), initialCount + 4);
  console.log(
    "PASS visitor counter: browser identity, reloads, concurrency, failures, and responsive footer",
  );
} finally {
  await browser.close();
}
