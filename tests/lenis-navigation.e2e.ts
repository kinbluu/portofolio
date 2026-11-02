import assert from "node:assert/strict";
import {
  connectAgentBrowser,
  launchIsolatedAgentBrowser,
} from "./agent-browser";
import type { AgentBrowser } from "./agent-browser";
import { startPortfolioMockServer } from "./portfolio-mocks";

const mock = await startPortfolioMockServer(
  process.env.PORTFOLIO_URL ?? "http://localhost:4321/",
);
const baseUrl = mock.url;
const browser = await connectAgentBrowser().catch(async (error) => {
  await mock.close();
  throw error;
});
const page = await browser.newPage().catch(async (error) => {
  await browser.disconnect();
  await mock.close();
  throw error;
});

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
  await page.press("Enter");
  await page.waitForFunction(() => window.location.hash === "#main-content");
  await page.press("Tab");
  assert.equal(
    await page.evaluate(() => Boolean(document.activeElement?.closest("main"))),
    true,
    "skip link must move keyboard navigation into the main content",
  );

  await verifyAssistantNavigation(browser, false);
  await verifyAssistantNavigation(browser, true);
  await verifyAssistantNavigation(browser, false, true);
  await verifyNestedScroll(browser);
  await verifyMobileScroll(browser);
  await verifyNoJavaScript();
  console.log(
    "PASS Lenis navigation, keyboard access, chat, mobile and no-JavaScript fallback",
  );
} finally {
  try {
    await page.close();
  } finally {
    try {
      await browser.disconnect();
    } finally {
      await mock.close();
    }
  }
}
async function verifyAssistantNavigation(
  browser: AgentBrowser,
  reducedMotion: boolean,
  mobile = false,
) {
  const page = await browser.newPage();
  let wheelPrevented: boolean | undefined;
  try {
    if (mobile) await page.setMobileViewport();
    else await page.setViewport({ width: 1024, height: 800 });
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
    const before = await page.evaluate(() => ({
      scrollY: window.scrollY,
      hash: window.location.hash,
    }));

    mock.state.chatScenario = "show-section";
    mock.state.chatRequests = 0;

    await page.$eval("#assistant button", (button) =>
      (button as HTMLButtonElement).click(),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("#assistant")
          ?.textContent?.includes("Here is his experience."),
      { timeout: 10_000 },
    );
    await page.waitForSelector('#assistant a[href="#experience"]');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const after = await page.evaluate(() => ({
      scrollY: window.scrollY,
      hash: window.location.hash,
    }));
    assert.ok(
      Math.abs(after.scrollY - before.scrollY) < 5,
      `the assistant must not move the page before the link is clicked (${before.scrollY} -> ${after.scrollY})`,
    );
    assert.equal(
      after.hash,
      before.hash,
      "the assistant must not change the URL",
    );
    assert.equal(
      mock.state.chatRequests,
      2,
      "the mocked client tool and follow-up must complete",
    );

    wheelPrevented = await page.evaluate(() => {
      const wheel = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: -700,
      });
      document.body.dispatchEvent(wheel);
      const link = document.querySelector<HTMLAnchorElement>(
        '#assistant a[href="#experience"]',
      );
      if (!link) throw new Error("assistant section link missing");
      link.click();
      return wheel.defaultPrevented;
    });
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
      wheelPrevented,
      !reducedMotion,
      "wheel handling must respect reduced motion",
    );
    if (mobile) {
      await page.click(".site-mobile-menu summary");
      await page.click('.site-mobile-menu a[href="#assistant"]');
    } else {
      await page.click('.site-desktop-nav a[href="#assistant"]');
    }
    await page.waitForFunction(() => window.location.hash === "#assistant");
    assert.ok(
      await page.$eval("#assistant", (element) =>
        element.textContent?.includes("Here is his experience."),
      ),
      "the answer must remain available after returning to the assistant",
    );
  } finally {
    await page.close();
  }
}
async function verifyNestedScroll(browser: AgentBrowser) {
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
    await page.mouseMove(before.x, before.y);
    await page.mouseWheel(350, before.x, before.y);
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
async function verifyMobileScroll(browser: AgentBrowser) {
  const page = await browser.newPage();
  try {
    await page.setMobileViewport();
    await page.goto(baseUrl, { waitUntil: "networkidle0" });
    await page.touchSwipe([
      { x: 200, y: 650 },
      { x: 200, y: 500 },
      { x: 200, y: 300 },
    ]);
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
async function verifyNoJavaScript() {
  const browser = await launchIsolatedAgentBrowser({
    javascriptEnabled: false,
  });
  try {
    const page = await browser.currentPage();
    await page.setViewport({ width: 1024, height: 800 });
    await page.goto(baseUrl, { waitUntil: "load" });
    assert.equal(
      await page.javascriptIsDisabled(),
      true,
      "browser JavaScript must be disabled",
    );
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
    await browser.disconnect();
  }
}
