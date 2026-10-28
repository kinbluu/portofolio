import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer, { type Page } from "puppeteer-core";
import * as THREE from "three";

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
    if (state === "ready") {
      const assembly = await page.$eval(
        "[data-studio-root]",
        (element) => (element as HTMLElement).dataset.studioAssembly,
      );
      assert.ok(
        assembly === "playing" || assembly === "complete",
        `Unexpected assembly state: ${assembly}`,
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.studioAssembly === "complete"',
        60000,
      );
      checks.push("Staged studio assembly completes");
    }
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
    const intro = await page.$eval("#top", (section) => {
      const headline = section.querySelector("h1")!;
      const name = section.querySelector(".studio-person")!;
      return {
        headline: headline.textContent?.replace(/\s+/g, " ").trim(),
        headlineSize: parseFloat(getComputedStyle(headline).fontSize),
        nameSize: parseFloat(getComputedStyle(name).fontSize),
      };
    });
    assert.equal(
      intro.headline,
      "I build web applications that make everyday work easier.",
    );
    assert.ok(intro.headlineSize > intro.nameSize);
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
      const workPose = await page.$eval("[data-studio-root]", (element) =>
        (element as HTMLElement).dataset.studioPose!.split(",").map(Number),
      );
      const monitor = [-1.45, 1.97, -2.505];
      assert.ok(
        Math.hypot(
          ...workPose.slice(0, 3).map((value, i) => value - monitor[i]),
        ) < 3.2,
        "Work camera should be close to the monitor",
      );
      assert.ok(
        Math.hypot(...workPose.slice(3).map((value, i) => value - monitor[i])) <
          0.2,
        "Work camera should look at the monitor",
      );
      checks.push("Work camera focuses on the monitor");
      await page.evaluate(() =>
        document
          .getElementById("experience")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.experienceFolder === "0" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const firstFolder = await page.$eval("[data-studio-root]", (element) =>
        (element as HTMLElement).dataset
          .experienceFolderOffsets!.split(",")
          .map(Number),
      );
      assert.ok(
        firstFolder[0] > 0.25 && Math.abs(firstFolder[1]) < 0.01,
        "First experience should bring out its folder",
      );
      await page.evaluate(() => {
        const second = document.querySelectorAll<HTMLElement>(
          "[data-experience-item]",
        )[1];
        window.scrollTo({
          top:
            scrollY +
            second.getBoundingClientRect().top +
            second.offsetHeight / 2 -
            innerHeight / 2,
          behavior: "instant",
        });
      });
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.experienceFolder === "1" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const secondFolder = await page.$eval("[data-studio-root]", (element) =>
        (element as HTMLElement).dataset
          .experienceFolderOffsets!.split(",")
          .map(Number),
      );
      assert.ok(
        secondFolder[1] > 0.25 && Math.abs(secondFolder[0]) < 0.01,
        "Second experience should bring out its folder",
      );
      checks.push("Experience folders follow the role being read");
      await page.evaluate(() =>
        document
          .getElementById("work")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "work" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
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
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "about" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const aboutPose = await page.$eval("[data-studio-root]", (element) =>
        (element as HTMLElement).dataset.studioPose!.split(",").map(Number),
      );
      const board = [1.25, 2.65, -3.446];
      assert.ok(
        Math.hypot(
          ...aboutPose.slice(0, 3).map((value, i) => value - board[i]),
        ) < 4.1,
        "Practice camera should approach the board",
      );
      assert.ok(
        Math.hypot(...aboutPose.slice(3).map((value, i) => value - board[i])) <
          0.1,
        "Practice camera should look at the board",
      );
      const studioContent = await page.$eval("[data-studio-root]", (element) =>
        JSON.parse((element as HTMLElement).dataset.studioConfig!),
      );
      assert.deepEqual(studioContent.practices, [
        "Role-based access",
        "Validated data",
        "Tested workflows",
      ]);
      checks.push("Practice camera and board focus on real practices");
      await page.evaluate(() =>
        document
          .getElementById("github")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "github" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const githubView = await page.$eval("[data-studio-root]", (element) => ({
        pose: (element as HTMLElement).dataset
          .studioPose!.split(",")
          .map(Number),
        shift: Number(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--studio-shift",
          ),
        ),
      }));
      const poster = [2.9, 1.1, -3.446];
      assert.ok(
        Math.hypot(
          ...githubView.pose.slice(0, 3).map((value, i) => value - poster[i]),
        ) < 3.2,
        "GitHub camera should approach the contribution poster",
      );
      assert.ok(
        Math.hypot(
          ...githubView.pose.slice(3).map((value, i) => value - poster[i]),
        ) < 0.1,
        "GitHub camera should look at the contribution poster",
      );
      assert.ok(
        githubView.shift > 0.1,
        "GitHub scene should shift right of the contribution calendar",
      );
      await page.screenshot({ path: "artifacts/studio-github.png" });
      checks.push("GitHub camera focuses on the contribution poster");
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
    if (state === "ready") {
      await page.setViewport({ width: 768, height: 900, deviceScaleFactor: 1 });
      await page.evaluate(() =>
        document
          .getElementById("work")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "work" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const tablet = await page.evaluate(() => {
        const scene =
          document.querySelector<HTMLElement>("[data-studio-root]")!;
        const bounds = scene.getBoundingClientRect();
        return {
          pose: scene.dataset.studioPose!.split(",").map(Number),
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          copyLeft: document
            .querySelector("#work .studio-copy")!
            .getBoundingClientRect().left,
        };
      });
      const camera = new THREE.PerspectiveCamera(
        36,
        tablet.width / tablet.height,
        0.1,
        100,
      );
      camera.position.set(tablet.pose[0], tablet.pose[1], tablet.pose[2]);
      camera.lookAt(tablet.pose[3], tablet.pose[4], tablet.pose[5]);
      camera.updateMatrixWorld();
      const screenX = [-0.655, 0.655].flatMap((x) =>
        [-0.41, 0.41].map((y) => {
          const point = new THREE.Vector3(-1.45 + x, 1.97 + y, -2.505).project(
            camera,
          );
          return tablet.left + ((point.x + 1) * tablet.width) / 2;
        }),
      );
      assert.ok(
        Math.min(...screenX) >= 0 && Math.max(...screenX) < tablet.copyLeft - 8,
        "Tablet monitor should remain visible beside the work copy",
      );
      assert.ok(
        Math.max(...screenX) - Math.min(...screenX) >= 200,
        "Tablet monitor should remain legible",
      );
      checks.push("Tablet monitor remains visible beside copy");
      await page.evaluate(() =>
        document
          .getElementById("about")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "about" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const tabletBoard = await page.evaluate(() => {
        const scene =
          document.querySelector<HTMLElement>("[data-studio-root]")!;
        const bounds = scene.getBoundingClientRect();
        return {
          pose: scene.dataset.studioPose!.split(",").map(Number),
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          copyLeft: document
            .querySelector("#about .studio-copy")!
            .getBoundingClientRect().left,
        };
      });
      const boardCamera = new THREE.PerspectiveCamera(
        36,
        tabletBoard.width / tabletBoard.height,
        0.1,
        100,
      );
      boardCamera.position.set(
        tabletBoard.pose[0],
        tabletBoard.pose[1],
        tabletBoard.pose[2],
      );
      boardCamera.lookAt(
        tabletBoard.pose[3],
        tabletBoard.pose[4],
        tabletBoard.pose[5],
      );
      boardCamera.updateMatrixWorld();
      const boardX = [-0.75, 0.75].flatMap((x) =>
        [-0.925, 0.925].map((y) => {
          const point = new THREE.Vector3(1.25 + x, 2.65 + y, -3.446).project(
            boardCamera,
          );
          return tabletBoard.left + ((point.x + 1) * tabletBoard.width) / 2;
        }),
      );
      assert.ok(
        Math.min(...boardX) >= 0 &&
          Math.max(...boardX) < tabletBoard.copyLeft - 8,
        "Tablet practice board should remain visible beside the copy",
      );
      assert.ok(
        Math.max(...boardX) - Math.min(...boardX) >= 160,
        "Tablet practice board should remain legible",
      );
      checks.push("Tablet practice board remains visible beside copy");
      await page.evaluate(() =>
        document
          .getElementById("github")
          ?.scrollIntoView({ behavior: "instant" }),
      );
      await until(
        page,
        'document.querySelector("[data-studio-root]")?.dataset.activeChapter === "github" && document.querySelector("[data-studio-root]")?.dataset.studioSettled === "true"',
        60000,
      );
      const tabletPoster = await page.evaluate(() => {
        const scene =
          document.querySelector<HTMLElement>("[data-studio-root]")!;
        const bounds = scene.getBoundingClientRect();
        return {
          pose: scene.dataset.studioPose!.split(",").map(Number),
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
          copyRight: document
            .querySelector("#github .studio-copy")!
            .getBoundingClientRect().right,
          viewport: innerWidth,
        };
      });
      const posterCamera = new THREE.PerspectiveCamera(
        36,
        tabletPoster.width / tabletPoster.height,
        0.1,
        100,
      );
      posterCamera.position.set(
        tabletPoster.pose[0],
        tabletPoster.pose[1],
        tabletPoster.pose[2],
      );
      posterCamera.lookAt(
        tabletPoster.pose[3],
        tabletPoster.pose[4],
        tabletPoster.pose[5],
      );
      posterCamera.updateMatrixWorld();
      const posterX = [-0.775, 0.775].flatMap((x) =>
        [-0.525, 0.525].map((y) => {
          const point = new THREE.Vector3(2.9 + x, 1.1 + y, -3.446).project(
            posterCamera,
          );
          return tabletPoster.left + ((point.x + 1) * tabletPoster.width) / 2;
        }),
      );
      assert.ok(
        Math.min(...posterX) > tabletPoster.copyRight + 8 &&
          Math.max(...posterX) < tabletPoster.viewport,
        "Tablet contribution poster should remain visible beside the calendar",
      );
      assert.ok(
        Math.max(...posterX) - Math.min(...posterX) >= 150,
        "Tablet contribution poster should remain legible",
      );
      checks.push("Tablet contribution poster remains visible beside calendar");
    }
    await page.setViewport({ width: 320, height: 900, deviceScaleFactor: 1 });
    const targets = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          ".studio-wordmark, .studio-intro-links a, .studio-enter, .studio-contact-links a, .studio-back",
        ),
      ].map((element) => ({
        text: element.textContent?.trim(),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })),
    );
    for (const target of targets) {
      assert.ok(
        target.width >= 44 && target.height >= 44,
        `Small touch target: ${target.text} (${target.width} × ${target.height})`,
      );
    }
    checks.push("320–2560px overflow", "Mobile touch targets");
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 });
    await page.evaluate(() =>
      document.getElementById("top")?.scrollIntoView({ behavior: "instant" }),
    );
    await page.screenshot({ path: "artifacts/studio-mobile.png" });
    await page.click("[data-menu-open]");
    await until(page, 'document.querySelector("#site-menu").open');
    await until(
      page,
      'document.querySelector("#site-menu").getAnimations().every((animation) => animation.playState === "finished")',
    );
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
    await until(
      page,
      '!!document.querySelector("[data-studio-root][data-studio-state=ready], [data-studio-root][data-studio-state=fallback]")',
      60000,
    );
    if (
      await page.$eval(
        "[data-studio-root]",
        (element) => (element as HTMLElement).dataset.studioState === "ready",
      )
    ) {
      assert.equal(
        await page.$eval(
          "[data-studio-root]",
          (element) => (element as HTMLElement).dataset.studioAssembly,
        ),
        "skipped",
      );
    }
    checks.push("Reduced-motion preference and static studio");
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
