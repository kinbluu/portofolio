// Run (dev server up): bun tests/menu-align.test.ts
// Env: URL and OBSCURA_CDP_URL select the app and browser endpoints.
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({
  browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
});
const page = await browser.newPage();

const menuSelector = "details[data-navigation-menu]";
const menuGeometry = () =>
  page.evaluate((selector) => {
    const menu = document.querySelector<HTMLDetailsElement>(selector)!;
    const summary = menu.querySelector("summary")!;
    const rect = (element: Element) => {
      const { x, y, width, height, right, bottom } =
        element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    return {
      origin: window.location.origin,
      viewportWidth: document.documentElement.clientWidth,
      menu: rect(menu),
      summary: rect(summary),
      links: [...menu.querySelectorAll<HTMLAnchorElement>("nav a")].map(
        (link) => ({
          href: link.href,
          rect: rect(link),
        }),
      ),
    };
  }, menuSelector);

for (const width of [320, 390, 768]) {
  const label = `${width}px`;
  await page.setViewport({ width, height: 800 });
  await page.goto(process.env.URL ?? "http://localhost:4321");
  for (const scrollY of [0, 600]) {
    await page.evaluate((y) => scrollTo(0, y), scrollY);
    await page.waitForFunction((y) => Math.round(scrollY) === y, {}, scrollY);
    const closed = await menuGeometry();
    assert.ok(
      closed.summary.width >= 44 && closed.summary.height >= 44,
      `${label} scroll=${scrollY}: summary hit target below 44px (${closed.summary.width}x${closed.summary.height})`,
    );
    assert.ok(
      closed.menu.x + closed.menu.width <= closed.viewportWidth &&
        closed.menu.x >= 0,
      `${label} scroll=${scrollY}: closed menu overflows viewport`,
    );

    await page.$eval(menuSelector, (element) => {
      (element as HTMLDetailsElement).open = true;
    });
    await page.waitForFunction(
      (selector) =>
        (document.querySelector(selector) as HTMLDetailsElement).open,
      {},
      menuSelector,
    );
    const opened = await menuGeometry();
    assert.ok(opened.links.length > 0, `${label}: menu has no links`);
    for (const link of opened.links) {
      assert.ok(
        link.href && new URL(link.href).origin === opened.origin,
        `${label}: invalid menu link destination ${link.href}`,
      );
      assert.ok(
        link.rect.width >= 44 && link.rect.height >= 44,
        `${label}: link hit target below 44px (${link.rect.width}x${link.rect.height})`,
      );
      assert.ok(
        link.rect.x >= 0 &&
          link.rect.x + link.rect.width <= opened.viewportWidth,
        `${label}: menu link overflows the viewport`,
      );
    }
    assert.ok(
      opened.menu.x >= 0 &&
        opened.menu.x + opened.menu.width <= opened.viewportWidth,
      `${label} scroll=${scrollY}: open menu overflows viewport (x=${opened.menu.x}, right=${opened.menu.right}, viewport=${opened.viewportWidth})`,
    );

    await page.$eval(menuSelector, (element) => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await page.waitForFunction(
      (selector) =>
        !(document.querySelector(selector) as HTMLDetailsElement).open,
      {},
      menuSelector,
    );
  }
}

await page.close();
browser.disconnect();
console.log(
  "PASS menu geometry, targets, destinations, property-open and dispatched Escape. UNVERIFIED: native Tab/Enter and toggle-click interaction (Obscura limitation).",
);
