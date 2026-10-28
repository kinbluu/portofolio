import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
  protocolTimeout: 60000,
});
const page = await browser.newPage();
const base = process.env.STUDIO_TEST_URL ?? "http://localhost:4321/";

try {
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ] as const) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(
      '!!document.querySelector("[data-studio-root][data-studio-state=ready], [data-studio-root][data-studio-state=fallback]")',
      { timeout: 60000 },
    );
    if (width >= 1024) {
      const targets = await page.$$eval(".studio-chapters a", (links) =>
        links.map((link) => {
          const rect = link.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      assert.ok(
        targets.every((target) => target.width >= 44 && target.height >= 44),
        "Chapter navigation should provide 44px targets",
      );
    }
    const launcherCenter = await page.$eval(
      "[data-chat-launcher]",
      (element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2;
      },
    );
    await page.evaluate(() =>
      document.getElementById("work")!.scrollIntoView({ behavior: "instant" }),
    );
    await page.waitForFunction(
      'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "work"',
    );
    const target = await page.evaluate((center) => {
      const stat = document.querySelector<HTMLElement>(
        ".studio-figures > div:last-child",
      )!;
      const rect = stat.getBoundingClientRect();
      return scrollY + rect.top + rect.height / 2 - center;
    }, launcherCenter);
    await page.evaluate(
      (y) => window.scrollTo({ top: y + 180, behavior: "instant" }),
      target,
    );
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      target,
    );
    await page.waitForFunction(
      () => {
        const launcher = document.querySelector<HTMLElement>(
          "[data-chat-launcher]",
        )!;
        const stat = document.querySelector<HTMLElement>(
          ".studio-figures > div:last-child",
        )!;
        const a = launcher.getBoundingClientRect();
        const b = stat.getBoundingClientRect();
        const overlap =
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top;
        return (
          !overlap ||
          a.top >= innerHeight ||
          getComputedStyle(launcher).opacity === "0"
        );
      },
      { timeout: 6000 },
    );
    await page.focus("[data-chat-launcher]");
    await page.waitForFunction(
      () => {
        const launcher = document.querySelector<HTMLElement>(
          "[data-chat-launcher]",
        )!;
        return (
          document.activeElement === launcher &&
          getComputedStyle(launcher).opacity !== "0"
        );
      },
      { timeout: 6000 },
    );
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    assert.equal(
      await page.$eval(
        "[data-chat-launcher]",
        (element) => (element as HTMLButtonElement).tabIndex,
      ),
      0,
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForFunction(
      () =>
        !document
          .querySelector("[data-chat-launcher]")
          ?.hasAttribute("data-hidden"),
    );
    assert.equal(
      await page.$eval(
        "[data-chat-launcher]",
        (element) =>
          (element as HTMLElement).getBoundingClientRect().top < innerHeight,
      ),
      true,
    );
  }
  await page.setViewport({ width: 320, height: 480, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  const contactHeading = await page.$eval("#contact h2", (element) => ({
    fontSize: parseFloat(getComputedStyle(element).fontSize),
    overflowWrap: getComputedStyle(element).overflowWrap,
    clientWidth: (element as HTMLElement).clientWidth,
    scrollWidth: (element as HTMLElement).scrollWidth,
  }));
  assert.ok(
    contactHeading.fontSize <= 36 &&
      contactHeading.overflowWrap !== "anywhere" &&
      contactHeading.scrollWidth <= contactHeading.clientWidth,
    "Contact heading should keep words intact on a narrow screen",
  );
  const figuresFit = await page.$$eval(".studio-figures dd", (items) =>
    items.every(
      (element) =>
        (element as HTMLElement).scrollWidth <=
        (element as HTMLElement).clientWidth + 1,
    ),
  );
  assert.ok(figuresFit, "Work figures should fit their mobile columns");
  await page.click("[data-menu-open]");
  await page.waitForFunction('document.querySelector("#site-menu")?.open');
  const menu = await page.$eval("#site-menu", (element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    };
  });
  assert.deepEqual(
    menu,
    { top: 0, left: 0, bottom: 480, right: 320 },
    "Mobile menu should fit the viewport",
  );
  const lastLink = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>("#site-menu > div")!;
    panel.scrollTop = panel.scrollHeight;
    const link = [...panel.querySelectorAll<HTMLAnchorElement>("a")].find(
      (element) => element.textContent?.trim() === "GitHub",
    )!;
    const rect = link.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: innerHeight };
  });
  assert.ok(
    lastLink.top >= 0 && lastLink.bottom <= lastLink.height,
    "Short-screen menu links should remain reachable",
  );
  console.log(
    "PASS studio polish: chapter targets, launcher clearance, and short-screen menu",
  );
} finally {
  await page.close();
  browser.disconnect();
}
