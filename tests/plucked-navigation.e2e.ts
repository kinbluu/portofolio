import assert from "node:assert/strict";
import { launchIsolatedAgentBrowser } from "./agent-browser";

const browser = await launchIsolatedAgentBrowser();
const page = await browser.newPage();
const url = process.env.PORTFOLIO_URL ?? "http://localhost:4321/";

try {
  await page.setViewport({ width: 1440, height: 900 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto(url);
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const markup = await page.evaluate(() => {
    const links = [
      ...document.querySelectorAll<HTMLAnchorElement>(".site-desktop-nav a"),
    ];
    return links.map((link) => {
      const svg = link.querySelector("svg")!;
      return {
        href: link.getAttribute("href"),
        target: Boolean(document.querySelector(link.hash)),
        height: link.getBoundingClientRect().height,
        viewBox: svg?.getAttribute("viewBox"),
        aspect: svg?.getAttribute("preserveAspectRatio"),
        hidden: svg?.getAttribute("aria-hidden"),
        svgHeight: svg?.getBoundingClientRect().height,
        pointerEvents: svg && getComputedStyle(svg).pointerEvents,
        paths: svg?.querySelectorAll("path").length,
      };
    });
  });
  assert.equal(markup.length, 6);
  for (const link of markup) {
    assert.ok(link.href && link.target);
    assert.ok(link.height >= 44);
    assert.equal(link.viewBox, "0 0 100 12");
    assert.equal(link.aspect, "none");
    assert.equal(link.hidden, "true");
    assert.equal(link.svgHeight, 12);
    assert.equal(link.pointerEvents, "none");
    assert.equal(link.paths, 1);
  }
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLElement>("[data-pluck-link]")]
      .filter((link) => link.getBoundingClientRect().width > 0)
      .every((link) => link.style.getPropertyValue("--ring-duration")),
  );
  const motion = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>(
      ".site-desktop-nav a",
    )!;
    const svg = link.querySelector("svg")!;
    const path = svg.querySelector("path")!;
    const rect = svg.getBoundingClientRect();
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const enter = (fraction: number, pointerType = "mouse") =>
      link.dispatchEvent(
        new PointerEvent("pointerenter", {
          pointerType,
          clientX: rect.left + rect.width * fraction,
        }),
      );
    enter(0, "pen");
    const penEntry = link.hasAttribute("data-plucked");
    enter(0);
    const left = {
      x: link.style.getPropertyValue("--pluck-x"),
      d: path.getAttribute("d"),
    };
    const animation = path.getAnimations()[0];
    const timing = animation?.effect?.getTiming();
    const duration = Number(timing?.duration);
    if (animation) animation.currentTime = duration * 0.21;
    const swing = new DOMMatrix(getComputedStyle(path).transform).d;
    enter(1);
    const right = {
      x: link.style.getPropertyValue("--pluck-x"),
      scale: new DOMMatrix(getComputedStyle(path).transform).d,
    };
    if (getComputedStyle(svg).clipPath !== "inset(0px 15% 0px 85%)") {
      throw new Error("re-entry must start closed at the new pluck point");
    }
    const pathStyle = getComputedStyle(path);
    const stroke = {
      width: pathStyle.strokeWidth,
      effect: pathStyle.vectorEffect,
      box: pathStyle.transformBox,
    };
    await wait(45);
    link.dispatchEvent(
      new PointerEvent("pointerleave", { pointerType: "mouse" }),
    );
    const leaving = {
      open: link.hasAttribute("data-plucked"),
      ringing: link.hasAttribute("data-ringing"),
      duration: getComputedStyle(path).transitionDuration,
    };
    await wait(180);
    const cleaned = !link.hasAttribute("data-ringing");
    enter(0.5);
    link.dispatchEvent(
      new PointerEvent("pointerleave", { pointerType: "mouse" }),
    );
    await wait(180);
    const fastLeaveCleaned = !link.hasAttribute("data-ringing");
    return {
      penEntry,
      left,
      right,
      width: rect.width,
      duration,
      easing: timing?.easing,
      swing,
      stroke,
      leaving,
      cleaned,
      fastLeaveCleaned,
    };
  });
  assert.equal(motion.penEntry, false);
  assert.equal(motion.left.x, "15%");
  assert.equal(motion.right.x, "85%");
  assert.ok(motion.left.d?.startsWith("M0 6 Q15 "));
  assert.ok(
    Math.abs(
      motion.duration - Math.max(400, Math.min(1200, motion.width * 13)),
    ) < 1,
  );
  assert.ok(motion.easing?.startsWith("linear("));
  assert.ok(motion.swing < 0, "string must swing through rest");
  assert.ok(
    motion.right.scale > 0.99,
    "re-entry must commit the fully bent starting state",
  );
  assert.equal(motion.stroke.width, "1.5px");
  assert.equal(motion.stroke.effect, "non-scaling-stroke");
  assert.equal(motion.stroke.box, "view-box");
  assert.equal(motion.leaving.open, false);
  assert.equal(motion.leaving.ringing, true);
  assert.notEqual(motion.leaving.duration, "0s");
  assert.ok(motion.cleaned && motion.fastLeaveCleaned);
  const resize = await page.evaluate(async () => {
    const link = document.querySelector<HTMLElement>(".site-desktop-nav a")!;
    const measure = () => ({
      width: link.querySelector("svg")!.getBoundingClientRect().width,
      duration: parseFloat(link.style.getPropertyValue("--ring-duration")),
    });
    const before = measure();
    const label = link.querySelector<HTMLElement>("span")!;
    label.style.width = "110px";
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = measure();
    label.style.removeProperty("width");
    return { before, after };
  });
  assert.notEqual(resize.before.duration, resize.after.duration);
  assert.ok(
    Math.abs(resize.after.duration - Math.min(1200, resize.after.width * 13)) <
      1,
  );
  await page.press("Tab");
  await page.focus(".site-desktop-nav a");
  const focus = await page.evaluate(async () => {
    const link = document.activeElement as HTMLElement;
    const svg = link.querySelector("svg")!;
    const path = svg.querySelector("path")!;
    const before = {
      visible: link.matches(":focus-visible"),
      clip: getComputedStyle(svg).clipPath,
      scale: new DOMMatrix(getComputedStyle(path).transform).d,
      duration: getComputedStyle(svg).transitionDuration,
      outline: getComputedStyle(link).outlineStyle,
    };
    link.blur();
    const during = new DOMMatrix(getComputedStyle(path).transform).d;
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      before,
      during,
      after: new DOMMatrix(getComputedStyle(path).transform).d,
    };
  });
  assert.ok(focus.before.visible);
  assert.equal(focus.before.clip, "inset(0px -1px)");
  assert.equal(focus.before.scale, 0.001);
  assert.equal(focus.before.duration, "0s");
  assert.notEqual(focus.before.outline, "none");
  assert.equal(focus.during, 0.001);
  assert.equal(focus.after, 1);
  const tap = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>(
      ".site-desktop-nav a",
    )!;
    const rect = link.getBoundingClientRect();
    const event = new PointerEvent("pointerdown", {
      pointerType: "touch",
      clientX: rect.left + rect.width / 2,
      cancelable: true,
    });
    link.dispatchEvent(event);
    const duration = parseFloat(link.style.getPropertyValue("--ring-duration"));
    await new Promise((resolve) => setTimeout(resolve, duration + 200));
    const settled = {
      open: link.hasAttribute("data-plucked"),
      scale: new DOMMatrix(
        getComputedStyle(link.querySelector("path")!).transform,
      ).d,
    };
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      prevented: event.defaultPrevented,
      settled,
      closed: !link.hasAttribute("data-plucked"),
      cleaned: !link.hasAttribute("data-ringing"),
    };
  });
  assert.equal(tap.prevented, false);
  assert.ok(tap.settled.open);
  assert.equal(tap.settled.scale, 0.001);
  assert.ok(tap.closed && tap.cleaned);
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  const reduced = await page.evaluate(() => {
    const link = document.querySelector<HTMLElement>(".site-desktop-nav a")!;
    const svg = link.querySelector("svg")!;
    const path = svg.querySelector("path")!;
    link.dispatchEvent(
      new PointerEvent("pointerenter", { pointerType: "mouse" }),
    );
    const scale = new DOMMatrix(getComputedStyle(path).transform).d;
    link.dispatchEvent(
      new PointerEvent("pointerleave", { pointerType: "mouse" }),
    );
    return {
      scale,
      animations: svg.getAnimations({ subtree: true }).length,
      cleaned: !link.hasAttribute("data-ringing"),
    };
  });
  assert.equal(reduced.scale, 0.001);
  assert.equal(reduced.animations, 0);
  assert.ok(reduced.cleaned);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.click(".site-mobile-menu summary");
  const mobile = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLAnchorElement>(
        ".site-mobile-menu nav a",
      ),
    ].every(
      (link) =>
        link.getBoundingClientRect().height >= 44 &&
        Boolean(link.querySelector("svg")),
    ),
  );
  assert.ok(mobile);
  await page.click('.site-mobile-menu a[href="#work"]');
  await page.waitForFunction(
    () =>
      location.hash === "#work" &&
      !document.querySelector<HTMLDetailsElement>(".site-mobile-menu")!.open,
  );
  assert.equal(
    await page.$eval(".site-wordmark", (link) =>
      link.getAttribute("aria-current"),
    ),
    "page",
  );
  console.log(
    "PASS plucked navigation: geometry, overshoot, retargeting, resize, leave cleanup, keyboard, touch, reduced motion, mobile and anchors",
  );
} finally {
  await page.close();
  await browser.disconnect();
}
