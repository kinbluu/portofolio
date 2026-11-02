import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { desktopCommand, DesktopCommandError } from "./desktop-browser";
import { AgentBrowser } from "./agent-browser";

const browserTests = [
  "tests/desktop-navigation.e2e.ts",
  "tests/portfolio-redesign.e2e.ts",
  "tests/lenis-scroll.e2e.ts",
  "tests/lenis-navigation.e2e.ts",
  "tests/visitor-count.e2e.ts",
  "tests/menu-align.e2e.ts",
  "tests/print-reveal.e2e.ts",
  "tests/github-island-failure.e2e.ts",
] as const;

type Launch = {
  pid: number;
  cdp: { http_endpoint: string };
  window?: { id: string };
};

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

async function waitForExit(pid: number): Promise<boolean> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (!processExists(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return !processExists(pid);
}

async function runTest(test: string): Promise<void> {
  const profile = await mkdtemp(
    join(process.env.EMPRYO_TMP ?? tmpdir(), "portfolio-agent-desktop-"),
  );
  let launch: Launch;
  try {
    launch = await desktopCommand<Launch>(
      "launch",
      process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
      "--no-attach",
      "--arg=--no-first-run",
      "--arg=--no-default-browser-check",
      "--arg=--password-store=basic",
      "--arg=--force-renderer-accessibility",
      `--arg=--user-data-dir=${profile}`,
      "--arg=about:blank",
      "--cdp",
    );
  } catch (error) {
    if (
      error instanceof DesktopCommandError &&
      error.delivery === "not_delivered"
    ) {
      await rm(profile, { recursive: true, force: true });
    } else {
      console.error(
        `Browser launch was not verified; profile retained at ${profile}`,
      );
    }
    throw error;
  }

  if (
    !Number.isSafeInteger(launch.pid) ||
    launch.pid <= 0 ||
    !launch.cdp?.http_endpoint
  ) {
    throw new Error(
      `agent-desktop returned incomplete launch details; profile retained at ${profile}`,
    );
  }

  const browser = new AgentBrowser();
  let connected = false;
  let cleanupError: Error | undefined;
  try {
    await browser.connect(launch.cdp.http_endpoint);
    connected = true;
    console.log(`\nRunning ${test}`);
    const child = spawn(process.execPath, [test], {
      stdio: "inherit",
      env: {
        ...process.env,
        AGENT_DESKTOP_CDP_URL: launch.cdp.http_endpoint,
        AGENT_DESKTOP_WINDOW_ID: launch.window?.id ?? "",
      },
    });
    const result = await new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    if (result.code !== 0) {
      throw new Error(`${test} failed (${result.signal ?? result.code})`);
    }
  } finally {
    if (connected && processExists(launch.pid)) {
      await browser.closeOwnedBrowser().catch(() => {});
    }
    if (connected) await browser.disconnect().catch(() => {});
    try {
      if (await waitForExit(launch.pid)) {
        await rm(profile, { recursive: true, force: true });
      } else {
        cleanupError = new Error(
          `Browser ${launch.pid} is still running; profile retained at ${profile}`,
        );
      }
    } catch (error) {
      cleanupError = error instanceof Error ? error : new Error(String(error));
    }
    if (cleanupError) console.error(cleanupError.message);
  }
  if (cleanupError) throw cleanupError;
}

const selected = process.argv.slice(2);
const tests = selected.length
  ? selected.map((name) => {
      const match = browserTests.find(
        (test) => test === name || basename(test) === name,
      );
      if (!match) throw new Error(`Unknown browser test: ${name}`);
      return match;
    })
  : browserTests;

for (const test of tests) await runTest(test);
