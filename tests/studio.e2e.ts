import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer, { type Page } from "puppeteer-core";

async function until(page: Page, expression: string, timeout = 30000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error("Timed out: " + expression);
}

async function verifyStudio() {
  const base = process.env.STUDIO_TEST_URL ?? "http://localhost:4321/";
  const browser = await puppeteer.connect({
    browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
    protocolTimeout: 60000,
  });
  const page = await browser.newPage();
  const errors: string[] = [];
  const checks: string[] = [];
  const unverified: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await mkdir("artifacts", { recursive: true });
  try {
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
    await until(
      page,
      '!!document.querySelector("[data-studio-root][data-studio-state=ready], [data-studio-root][data-studio-state=fallback]")',
      60000,
    );
    const state = await page.$eval(
      "[data-studio-root]",
      (e) => (e as HTMLElement).dataset.studioState,
    );
    const content = await page.evaluate(() => ({
      sections: [...document.querySelectorAll("[data-studio-chapter]")].map(
        (e) => e.id,
      ),
      text: document.querySelector("main")?.textContent,
      menu: document.querySelector<HTMLDialogElement>("#site-menu")?.open,
    }));
    assert.deepEqual(content.sections, [
      "top",
      "work",
      "experience",
      "about",
      "github",
      "contact",
    ]);
    for (const text of [
      "Mochammad Rahmat Muttaqin",
      "Registration",
      "Scheduling",
      "Attendance",
      "Report cards",
      "Payment APIs",
      "Solidity",
      "Mobile development with Expo",
      "mrahmatmuttaqin@gmail.com",
    ])
      assert.ok(
        content.text?.includes(text),
        "Missing existing content: " + text,
      );
    assert.equal(content.menu, false);
    checks.push("Existing content and anchors", "Initial menu closed");
    await page.screenshot({ path: "artifacts/studio-desktop.png" });
    const first = await page.$eval(
      "[data-studio-root]",
      (e) => (e as HTMLElement).dataset.studioPose,
    );
    await page.evaluate(() =>
      document.getElementById("work")?.scrollIntoView({ behavior: "instant" }),
    );
    await until(
      page,
      'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "work"',
    );
    checks.push("Scroll selects the matching chapter");
    if (state === "ready") {
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
      );
      assert.notEqual(
        await page.$eval(
          "[data-studio-root]",
          (e) => (e as HTMLElement).dataset.studioPose,
        ),
        first,
      );
      await page.click("[data-studio-motion]");
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
      );
      const paused = await page.$eval(
        "[data-studio-root]",
        (e) => (e as HTMLElement).dataset.studioPose,
      );
      await page.evaluate(() =>
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "about"',
      );
      assert.equal(
        await page.$eval(
          "[data-studio-root]",
          (e) => (e as HTMLElement).dataset.studioPose,
        ),
        paused,
      );
      await page.click("[data-studio-motion]");
      checks.push(
        "GPU rendering",
        "Camera follows scroll",
        "Pause/resume camera",
      );
    } else {
      checks.push("Unavailable GPU preserves illustrated room and content");
      unverified.push(
        "GPU rendering, camera pixels, and GPU pause/resume: browser exposes no usable adapter/context",
      );
    }
    await page.screenshot({ path: "artifacts/studio-work.png" });
    await page.evaluate(() =>
      document.getElementById("top")?.scrollIntoView({ behavior: "instant" }),
    );
    const theme = await page.$eval(
      "html",
      (e) => (e as HTMLElement).dataset.theme,
    );
    await page.click("header [data-theme-toggle]");
    await until(
      page,
      "document.documentElement.dataset.theme !== " + JSON.stringify(theme),
    );
    assert.equal(
      await page.$eval(
        ".studio-fallback-dark",
        (e) => getComputedStyle(e).display,
      ),
      "block",
    );
    await page.screenshot({ path: "artifacts/studio-dark.png" });
    await page.click("header [data-theme-toggle]");
    checks.push("Day/night UI and illustration");
    for (const width of [320, 375, 414, 768, 1440, 2560]) {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
        "Horizontal overflow at " + width,
      );
    }
    checks.push("320–2560px overflow");
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
    await page.evaluate(() =>
      document.getElementById("top")?.scrollIntoView({ behavior: "instant" }),
    );
    await page.screenshot({ path: "artifacts/studio-mobile.png" });
    await page.click("[data-menu-open]");
    await until(page, 'document.querySelector("#site-menu").open');
    await page.click('#site-menu a[href="#experience"]');
    await until(page, '!document.querySelector("#site-menu").open');
    checks.push("Mobile menu and chapter navigation");
    await page.evaluate(() =>
      document.getElementById("top")?.scrollIntoView({ behavior: "instant" }),
    );
    await until(
      page,
      '!document.querySelector("[data-chat-launcher]").hasAttribute("data-hidden")',
    );
    const nativePopover = await page.evaluate(() => {
      const popover = document.createElement("div");
      popover.id = "native-popover-capability";
      popover.setAttribute("popover", "");
      const trigger = document.createElement("button");
      trigger.setAttribute("popovertarget", popover.id);
      document.body.appendChild(popover);
      document.body.appendChild(trigger);
      trigger.click();
      const supported = popover.matches(":popover-open");
      trigger.remove();
      popover.remove();
      return supported;
    });
    await page.click("[data-chat-launcher]");
    if (!nativePopover) {
      unverified.push(
        "Declarative popover activation and CSS active-state rendering: isolated native controls also fail in this browser",
      );
      await page.evaluate(() =>
        document.querySelector<HTMLElement>("#chat-panel")?.showPopover(),
      );
    }
    await until(
      page,
      'document.querySelector("#chat-panel").matches(":popover-open")',
    );
    assert.ok(await page.$("#chat-panel textarea, #chat-panel input"));
    await page.keyboard.press("Escape");
    checks.push(
      nativePopover
        ? "Existing chat opens from launcher"
        : "Chat content and native popover state",
    );
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await until(
      page,
      'document.documentElement.dataset.motionPaused === "true"',
    );
    checks.push("Reduced-motion preference");
    const noJs = await browser.newPage();
    await noJs.setJavaScriptEnabled(false);
    await noJs.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
    assert.ok(await noJs.$('#contact a[href^="mailto:"]'));
    assert.ok(await noJs.$("[data-studio-fallback]"));
    await noJs.close();
    checks.push("No-JavaScript content and contacts");
    assert.deepEqual(errors, []);
    const report = {
      result: unverified.length ? "PARTIAL_VERIFICATION" : "PASS",
      url: base,
      rendererState: state,
      checks,
      unverified,
      errors,
    };
    await writeFile(
      "artifacts/studio-verification.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await page.close();
    browser.disconnect();
  }
}

await verifyStudio();
