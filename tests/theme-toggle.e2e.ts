// Run with the dev server running: bun tests/run-desktop.ts theme-toggle.e2e.ts
import assert from "node:assert/strict";
import { connectAgentBrowser } from "./agent-browser";
import type { AgentPage } from "./agent-browser";

const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:4321/";
const toggleSelector = "[data-theme-toggle]";
const canvas = { light: "rgb(233, 233, 235)", dark: "rgb(17, 18, 20)" };

const browser = await connectAgentBrowser();
try {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  try {
    await verifyThemeToggle(page);
  } finally {
    await context.close();
  }

  const noJsContext = await browser.createBrowserContext({
    javascriptEnabled: false,
  });
  const noJs = await noJsContext.newPage();
  try {
    await noJs.goto(baseUrl, { waitUntil: "domcontentloaded" });
    assert.equal(
      await noJs.javascriptIsDisabled(),
      true,
      "browser JavaScript must be disabled",
    );
    assert.equal(
      await noJs.$eval(
        toggleSelector,
        (node) => getComputedStyle(node).display,
      ),
      "none",
      "without JavaScript the theme control must stay out of the page",
    );
  } finally {
    await noJsContext.close();
  }

  const blockedContext = await browser.createBrowserContext({
    initScript:
      'Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });',
  });
  const blocked = await blockedContext.newPage();
  try {
    await blocked.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await blocked.click(toggleSelector);
    const blockedState = await readToggle(blocked);
    assert.equal(
      blockedState.canvas,
      canvas.dark,
      "a blocked storage must not stop the theme from switching",
    );
    assert.equal(blockedState.stored, null, "a blocked storage keeps nothing");
  } finally {
    await blockedContext.close();
  }

  console.log(
    "PASS theme toggle: device default, override, persistence, keyboard, icons, geometry, no-JavaScript and blocked storage",
  );
} finally {
  await browser.disconnect();
}

async function verifyThemeToggle(page: AgentPage) {
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  let state = await readToggle(page);
  assert.equal(
    state.hidden,
    false,
    "the control must show once the script runs",
  );
  assert.equal(
    state.name,
    "Dark theme",
    "the control needs an accessible name",
  );
  assert.equal(
    state.pressed,
    "false",
    "a light page means the dark theme is off",
  );
  assert.equal(
    state.theme,
    null,
    "with no choice stored the document must keep following the device",
  );
  assert.equal(state.canvas, canvas.light);
  assert.ok(
    state.width >= 44 && state.height >= 44,
    `theme control hit area is ${state.width}x${state.height}`,
  );
  assert.equal(
    state.icons.filter((icon) => icon.transition.includes("opacity")).length,
    2,
    "both icons must cross-fade across a state change",
  );

  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  state = await readToggle(page);
  assert.equal(state.canvas, canvas.dark, "the device scheme must apply live");
  assert.equal(state.pressed, "true", "a dark page means the dark theme is on");
  assert.equal(state.theme, null, "following the device stores nothing");

  await page.click(toggleSelector);
  state = await readToggle(page);
  assert.equal(state.theme, "light", "a press must pin the other theme");
  assert.equal(
    state.canvas,
    canvas.light,
    "the pinned theme must win the device",
  );
  assert.equal(state.pressed, "false");
  assert.equal(state.name, "Dark theme", "the accessible name must not change");
  assert.equal(state.stored, "light", "the choice must outlive the visit");

  await page.reload({ waitUntil: "domcontentloaded" });
  state = await readToggle(page);
  assert.equal(
    state.theme,
    "light",
    "the head must apply a stored choice before the body paints",
  );
  assert.equal(state.canvas, canvas.light);

  await page.focus(toggleSelector);
  await page.press("Enter");
  state = await readToggle(page);
  assert.equal(state.theme, "dark", "Enter must work the control");
  assert.equal(state.stored, "dark");

  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  state = await readToggle(page);
  assert.deepEqual(
    state.icons.map((icon) => icon.transition),
    ["opacity 0.15s ease-out", "opacity 0.15s ease-out"],
    "reduced motion must keep the cross-fade and drop the movement",
  );

  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  for (const width of [320, 768, 961, 1440]) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => scrollTo(0, 700));
    await page.waitForFunction(() => {
      const header = document.querySelector<HTMLElement>(".site-header");
      if (!header?.hasAttribute("data-floating")) return false;
      const probe = window as Window & {
        __pill?: { width: number; stable: number };
      };
      const pill = Math.round(header.getBoundingClientRect().width);
      probe.__pill =
        probe.__pill?.width === pill
          ? { width: pill, stable: probe.__pill.stable + 1 }
          : { width: pill, stable: 0 };
      return probe.__pill.stable >= 4;
    });
    const measured = await readToggle(page);
    assert.equal(
      measured.insideHeader,
      true,
      `${width}px: the control must stay inside the header`,
    );
    assert.equal(
      measured.headerOverflow,
      0,
      `${width}px: the header content overflows its own box`,
    );
    assert.equal(
      measured.documentOverflow,
      0,
      `${width}px: the page scrolls sideways`,
    );
    assert.ok(
      measured.headerHeight <= 60,
      `${width}px: the header grew to ${measured.headerHeight}px`,
    );
  }
}

async function readToggle(page: AgentPage) {
  return page.evaluate(() => {
    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!(toggle instanceof HTMLButtonElement) || !header)
      throw new Error("theme control or header missing");
    const box = toggle.getBoundingClientRect();
    const outer = header.getBoundingClientRect();
    return {
      theme: document.documentElement.dataset.theme ?? null,
      name: toggle.getAttribute("aria-label"),
      pressed: toggle.getAttribute("aria-pressed"),
      hidden: toggle.hasAttribute("hidden"),
      width: Math.round(box.width),
      height: Math.round(box.height),
      insideHeader: box.left >= outer.left && box.right <= outer.right,
      headerHeight: Math.round(outer.height),
      headerOverflow: header.scrollWidth - header.clientWidth,
      documentOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      stored: (() => {
        try {
          return localStorage.getItem("portfolio-theme");
        } catch {
          return null;
        }
      })(),
      canvas: getComputedStyle(document.documentElement).backgroundColor,
      icons: ["moon", "sun"].map((name) => ({
        name,
        transition: getComputedStyle(
          document.querySelector<HTMLElement>(`[data-theme-icon="${name}"]`) ??
            document.documentElement,
        ).transition,
      })),
    };
  });
}
