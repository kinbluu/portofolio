import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
import type { Browser, HTTPRequest } from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
});
const page = await browser.newPage();
const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:4321/";

try {
  await page.setViewport({ width: 1024, height: 800 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(baseUrl, { waitUntil: "networkidle0" });

  const modifiedClick = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>(
      '.site-desktop-nav a[href="#experience"]',
    );
    if (!link) throw new Error("experience link missing");
    window.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { y: window.scrollY, hash: window.location.hash };
  });
  assert.equal(
    modifiedClick.hash,
    "",
    "modified click must not navigate this tab",
  );
  assert.equal(modifiedClick.y, 0, "modified click must not scroll this tab");

  const cancelledClick = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>(
      '.site-desktop-nav a[href="#experience"]',
    );
    if (!link) throw new Error("experience link missing");
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    });
    link.click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return window.scrollY;
  });
  assert.equal(cancelledClick, 0, "cancelled links must not scroll the page");

  const wheelStart = await page.evaluate(() => {
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 700,
    });
    document.body.dispatchEvent(wheel);
    return { prevented: wheel.defaultPrevented, position: window.scrollY };
  });
  assert.equal(wheelStart.prevented, true, "Lenis must handle wheel input");
  assert.equal(
    wheelStart.position,
    0,
    "wheel scrolling must not jump to the destination immediately",
  );
  await page.waitForFunction(() => window.scrollY > 0 && window.scrollY < 690, {
    timeout: 5_000,
  });
  await page.waitForFunction(() => window.scrollY >= 690, { timeout: 5_000 });

  const anchor = await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const wheel = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 700,
    });
    document.body.dispatchEvent(wheel);
    const link = document.querySelector<HTMLAnchorElement>(
      '.site-desktop-nav a[href="#experience"]',
    );
    if (!link) throw new Error("experience link missing");
    link.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      prevented: wheel.defaultPrevented,
      hash: window.location.hash,
      top: document.querySelector("#experience")?.getBoundingClientRect().top,
    };
  });
  assert.equal(anchor.prevented, true, "Lenis must handle wheel scrolling");
  assert.equal(anchor.hash, "#experience", "native anchor hash must update");
  assert.ok(
    anchor.top !== undefined && Math.abs(anchor.top - 160) < 10,
    `anchor must reach its target despite wheel inertia (top: ${anchor.top})`,
  );
  await page.goto(baseUrl, { waitUntil: "networkidle0" });
  await page.focus(".skip-link");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.location.hash === "#main-content");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.closest("main"))),
    true,
    "skip link must move keyboard navigation into the main content",
  );

  await verifyAssistantNavigation(browser, false);
  await verifyAssistantNavigation(browser, true);
  await verifyNestedScroll(browser);
  await verifyMobileScroll(browser);
  await verifyNoJavaScript(browser);
  console.log(
    "PASS Lenis navigation, keyboard access, chat, mobile and no-JavaScript fallback",
  );
} finally {
  await page.close();
  await browser.close();
}
async function verifyAssistantNavigation(
  browser: Browser,
  reducedMotion: boolean,
) {
  const page = await browser.newPage();
  let requests = 0;
  let wheelPrevented: boolean | undefined;
  try {
    await page.setViewport({ width: 1024, height: 800 });
    await page.emulateMediaFeatures([
      {
        name: "prefers-reduced-motion",
        value: reducedMotion ? "reduce" : "no-preference",
      },
    ]);
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.$eval("#assistant", (element) =>
      element.scrollIntoView({ behavior: "instant" }),
    );
    await page.waitForFunction(
      () =>
        !(
          document.querySelector<HTMLInputElement>("#chat-message")?.disabled ??
          true
        ),
      { timeout: 10_000 },
    );

    await page.setRequestInterception(true);
    page.on("request", async (request: HTTPRequest) => {
      if (new URL(request.url()).pathname !== "/api/chat") {
        await request.continue();
        return;
      }
      requests++;
      const { threadId = "test", runId = "test" } = JSON.parse(
        (await request.fetchPostData()) || "{}",
      );
      const timestamp = Date.now();
      if (requests === 1) {
        wheelPrevented = await page.evaluate(() => {
          const wheel = new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            deltaY: -700,
          });
          document.body.dispatchEvent(wheel);
          return wheel.defaultPrevented;
        });
      }
      const events =
        requests === 1
          ? [
              { type: "RUN_STARTED", threadId, runId, timestamp },
              {
                type: "TOOL_CALL_START",
                toolCallId: "call_1",
                toolCallName: "show_section",
                timestamp,
              },
              {
                type: "TOOL_CALL_ARGS",
                toolCallId: "call_1",
                delta: JSON.stringify({ section: "experience" }),
                timestamp,
              },
              { type: "TOOL_CALL_END", toolCallId: "call_1", timestamp },
              { type: "RUN_FINISHED", threadId, runId, timestamp },
            ]
          : [
              { type: "RUN_STARTED", threadId, runId, timestamp },
              {
                type: "TEXT_MESSAGE_START",
                messageId: "test",
                role: "assistant",
                timestamp,
              },
              {
                type: "TEXT_MESSAGE_CONTENT",
                messageId: "test",
                delta: "Berikut pengalamannya.",
                timestamp,
              },
              { type: "TEXT_MESSAGE_END", messageId: "test", timestamp },
              { type: "RUN_FINISHED", threadId, runId, timestamp },
            ];
      await request.respond({
        status: 200,
        contentType: "text/event-stream",
        body: events
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
      });
    });

    await page.$eval("#assistant button", (button) =>
      (button as HTMLButtonElement).click(),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("#assistant")
          ?.textContent?.includes("Berikut pengalamannya."),
      { timeout: 10_000 },
    );
    await page.waitForFunction(
      () =>
        Math.abs(
          (document.querySelector("#experience")?.getBoundingClientRect().top ??
            0) - 160,
        ) < 10,
      { timeout: 5_000 },
    );
    assert.equal(
      requests,
      2,
      "the mocked client tool and follow-up must complete",
    );
    assert.equal(
      wheelPrevented,
      !reducedMotion,
      "wheel handling must respect reduced motion",
    );
  } finally {
    await page.close();
  }
}
async function verifyNestedScroll(browser: Browser) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1024, height: 800 });
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.$eval("#assistant", (element) =>
      element.scrollIntoView({ behavior: "instant" }),
    );
    await page.waitForFunction(
      () =>
        !(
          document.querySelector<HTMLInputElement>("#chat-message")?.disabled ??
          true
        ),
      { timeout: 10_000 },
    );
    await page.evaluate(() => {
      const log = document.querySelector<HTMLElement>(
        "[data-lenis-prevent] [role=log]",
      );
      if (!log) throw new Error("chat log missing");
      log.insertAdjacentHTML(
        "beforeend",
        '<div style="height: 1500px; flex-shrink: 0"></div>',
      );
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const before = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>(
        "[data-lenis-prevent] .overflow-y-auto",
      );
      if (!viewport) throw new Error("chat viewport missing");
      viewport.scrollTop = 100;
      const rect = viewport.getBoundingClientRect();
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        pageY: window.scrollY,
      };
    });
    await page.mouse.move(before.x, before.y);
    await page.mouse.wheel({ deltaY: 350 });
    await page.waitForFunction(
      () =>
        (document.querySelector<HTMLElement>(
          "[data-lenis-prevent] .overflow-y-auto",
        )?.scrollTop ?? 0) > 120,
      { timeout: 5_000 },
    );
    assert.equal(
      await page.evaluate(() => window.scrollY),
      before.pageY,
      "scrolling chat must not move the page",
    );
  } finally {
    await page.close();
  }
}
async function verifyMobileScroll(browser: Browser) {
  const page = await browser.newPage();
  try {
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.touchscreen.touchStart(200, 650);
    await page.touchscreen.touchMove(200, 500);
    await page.touchscreen.touchMove(200, 300);
    await page.touchscreen.touchEnd();
    await page.waitForFunction(() => window.scrollY > 100, { timeout: 5_000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.click(".site-mobile-menu summary");
    await page.click('.site-mobile-menu a[href="#experience"]');
    await page.waitForFunction(() => window.location.hash === "#experience");
    await page.waitForFunction(
      () =>
        Math.abs(
          (document.querySelector("#experience")?.getBoundingClientRect().top ??
            0) - 160,
        ) < 10,
      { timeout: 5_000 },
    );
    assert.equal(
      await page.$eval(
        ".site-mobile-menu",
        (menu) => (menu as HTMLDetailsElement).open,
      ),
      false,
    );
  } finally {
    await page.close();
  }
}
async function verifyNoJavaScript(browser: Browser) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1024, height: 800 });
    await page.setJavaScriptEnabled(false);
    await page.goto(baseUrl, { waitUntil: "load" });
    assert.equal(
      await page.evaluate(() =>
        document.documentElement.classList.contains("lenis"),
      ),
      false,
    );
    await page.click('.site-desktop-nav a[href="#experience"]');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = await page.evaluate(() => ({
      hash: window.location.hash,
      top: document.querySelector("#experience")?.getBoundingClientRect().top,
    }));
    assert.equal(result.hash, "#experience");
    assert.ok(result.top !== undefined && Math.abs(result.top - 160) < 10);
  } finally {
    await page.close();
  }
}
