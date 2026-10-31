import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";

const baseUrl = process.env.PORTFOLIO_URL ?? "http://localhost:4321/";
const browser = await puppeteer.connect({
  browserURL: process.env.OBSCURA_CDP_URL ?? "http://127.0.0.1:9222",
  protocolTimeout: 60_000,
});
const page = await browser.newPage();
await verifyPortfolio(page, baseUrl, browser);

async function verifyPortfolio(
  page: import("puppeteer-core").Page,
  baseUrl: string,
  browser: import("puppeteer-core").Browser,
) {
  page.setDefaultNavigationTimeout(30_000);
  try {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      const state = await page.evaluate(() => {
        const experience = document.getElementById("experience");
        const github = document.getElementById("github");
        return {
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          language: document.documentElement.lang,
          assistantLanguage: document
            .querySelector("#assistant")
            ?.getAttribute("lang"),
          locale: document
            .querySelector('meta[property="og:locale"]')
            ?.getAttribute("content"),
          description: document
            .querySelector('meta[name="description"]')
            ?.getAttribute("content"),
          navigationLabels: [
            ...document.querySelectorAll(".site-desktop-nav a"),
          ].map((link) => link.textContent?.trim()),
          headline: document.querySelector("h1")?.textContent?.trim(),
          assistantPlaceholder: document
            .querySelector("#chat-message")
            ?.getAttribute("placeholder"),
          headings: [...document.querySelectorAll("h1")].filter(
            (h) => h.getClientRects().length && h.textContent?.trim(),
          ).length,
          main: document.querySelectorAll("main").length,
          anchors: [
            "work",
            "experience",
            "about",
            "github",
            "contact",
            "assistant",
          ].map((id) => Boolean(document.getElementById(id))),
          githubFollowsExperience: Boolean(
            experience &&
            github &&
            experience.compareDocumentPosition(github) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          canvases: document.querySelectorAll("canvas").length,
          socialImage:
            document.querySelector(
              'meta[property="og:image"], meta[name="twitter:image"]',
            ) !== null,
          links: [
            ...document.querySelectorAll<HTMLAnchorElement>("a[href]"),
          ].map((a) => ({
            href: a.getAttribute("href") ?? "",
            target: a.target,
            rel: a.rel,
          })),
        };
      });
      assert.ok(
        state.document <= state.viewport,
        `horizontal overflow at ${width}px: ${state.document} > ${state.viewport}`,
      );
      assert.equal(state.language, "en");
      assert.equal(state.assistantLanguage, "en");
      assert.equal(state.locale, "en_US");
      assert.match(state.description ?? "", /Full Stack Developer in Surabaya/);
      assert.deepEqual(state.navigationLabels, [
        "Work",
        "Experience",
        "GitHub",
        "About",
        "AI Assistant",
        "Contact",
      ]);
      assert.equal(
        state.headline,
        "I build web applications that make everyday work easier.",
      );
      assert.equal(state.assistantPlaceholder, "Ask about Rahmat…");
      assert.equal(state.headings, 1, `expected one visible h1 at ${width}px`);
      assert.equal(state.main, 1);
      assert.ok(
        state.anchors.every(Boolean),
        "required section anchors missing",
      );
      assert.ok(state.githubFollowsExperience, "GitHub must follow experience");
      assert.equal(state.canvases, 0, "portfolio must not render 3D canvas");
      assert.equal(
        state.socialImage,
        false,
        "old social preview must be disabled",
      );
      for (const link of state.links) {
        if (link.href.startsWith("#"))
          assert.ok(await page.$(link.href), `broken anchor ${link.href}`);
        else if (/^https?:/.test(link.href))
          assert.ok(new URL(link.href).hostname);
        else
          assert.match(
            link.href,
            /^(mailto|tel):.+/,
            `invalid link ${link.href}`,
          );
        if (link.target === "_blank")
          assert.match(
            link.rel,
            /noopener|noreferrer/,
            `unsafe link ${link.href}`,
          );
      }
    }

    const backgrounds: string[] = [];
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: scheme },
      ]);
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      assert.equal(
        await page.evaluate(
          () => matchMedia("(prefers-color-scheme: dark)").matches,
        ),
        scheme === "dark",
      );
      backgrounds.push(
        await page.$eval(
          ".page-shell",
          (el) => getComputedStyle(el).backgroundColor,
        ),
      );
    }
    assert.notEqual(
      backgrounds[0],
      backgrounds[1],
      "light and dark surfaces should differ",
    );
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: "light" },
    ]);
    assert.equal(
      await page.$eval(
        ".page-shell",
        (el) => getComputedStyle(el).backgroundColor,
      ),
      backgrounds[0],
      "theme should follow device changes without a reload",
    );

    const response = await fetch(baseUrl);
    assert.ok(response.ok, `SSR request failed: ${response.status}`);
    const html = await response.text();
    const ids = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
    );
    assert.ok(
      ["main-content", "work", "experience", "about"].every((id) =>
        ids.has(id),
      ),
      "SSR HTML must contain the main sections",
    );
    assert.match(
      html,
      /Mochammad Rahmat Muttaqin/,
      "SSR HTML must contain the profile name",
    );
    assert.match(
      html,
      /This assistant requires JavaScript/,
      "SSR must include the assistant fallback",
    );
    assert.match(
      html,
      /GitHub activity is currently unavailable/,
      "SSR must include the GitHub fallback",
    );
    await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.focus(".skip-link");
    assert.equal(
      await page.evaluate(() => document.activeElement?.getAttribute("href")),
      "#main-content",
    );
    await page.focus("[data-navigation-menu] summary");
    assert.equal(
      await page.evaluate(() => document.activeElement?.tagName),
      "SUMMARY",
    );
    await page.evaluate(() => {
      const menu = document.querySelector<HTMLDetailsElement>(
        "[data-navigation-menu]",
      );
      if (!menu) throw new Error("mobile navigation missing");
      menu.open = true;
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    assert.equal(
      await page.$eval(
        "[data-navigation-menu]",
        (el) => (el as HTMLDetailsElement).open,
      ),
      false,
    );
    await verifyMockChat(page);
    await verifyGitHubFailure(page, baseUrl);
    console.log(
      "PASS portfolio: responsive layout, anchors, themes, SSR content, focus, mocked chat and GitHub fallback",
    );
    console.log(
      "UNVERIFIED: no-JavaScript browser behavior and native Tab/Enter activation are unavailable in Obscura",
    );
  } finally {
    await page.close();
    browser.disconnect();
  }
}

async function verifyMockChat(page: import("puppeteer-core").Page) {
  let intercepted = 0;
  const onRequest = async (request: import("puppeteer-core").HTTPRequest) => {
    if (new URL(request.url()).pathname !== "/api/chat") {
      await request.continue();
      return;
    }
    intercepted++;
    const { threadId = "test", runId = "test" } = JSON.parse(
      (await request.fetchPostData()) || "{}",
    );
    const timestamp = Date.now();
    const events = [
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
        delta: "This is a test response.",
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
  };
  await page.setRequestInterception(true);
  page.on("request", onRequest);
  try {
    await page.$eval("#assistant", (element) => element.scrollIntoView());
    await page.waitForFunction(
      () =>
        !(
          document.querySelector<HTMLInputElement>("#chat-message")?.disabled ??
          true
        ),
      { timeout: 10_000 },
    );
    await page.$eval("#assistant button", (button) =>
      (button as HTMLButtonElement).click(),
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("#assistant")
          ?.textContent?.includes("This is a test response."),
      { timeout: 10_000 },
    );
    assert.equal(intercepted, 1, "chat request must be intercepted locally");
  } finally {
    page.off("request", onRequest);
    await page.setRequestInterception(false);
  }
}
async function verifyGitHubFailure(
  page: import("puppeteer-core").Page,
  baseUrl: string,
) {
  let failure: "http" | "network" = "http";
  let blocked = 0;
  const onRequest = async (request: import("puppeteer-core").HTTPRequest) => {
    if (!new URL(request.url()).pathname.startsWith("/_server-islands/")) {
      await request.continue();
      return;
    }
    blocked++;
    if (failure === "network") await request.abort("failed");
    else await request.respond({ status: 503, body: "" });
  };
  await page.setRequestInterception(true);
  page.on("request", onRequest);
  try {
    for (failure of ["http", "network"] as const) {
      blocked = 0;
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
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
          Boolean(document.querySelector("[data-github-error]:not([hidden])")),
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
  } finally {
    page.off("request", onRequest);
    await page.setRequestInterception(false);
  }
}
