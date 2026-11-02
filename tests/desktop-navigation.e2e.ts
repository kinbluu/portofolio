import assert from "node:assert/strict";
import { desktopCommand } from "./desktop-browser";
import { connectAgentBrowser } from "./agent-browser";

type AccessibleNode = {
  role?: string;
  name?: string;
  ref_id?: string;
  states?: string[];
  children?: AccessibleNode[];
};

type Snapshot = { complete: boolean; tree: AccessibleNode };

function findNodes(
  node: AccessibleNode,
  role: string,
  name: string,
): AccessibleNode[] {
  return [
    ...(node.role === role && node.name === name ? [node] : []),
    ...(node.children ?? []).flatMap((child) => findNodes(child, role, name)),
  ];
}

async function snapshot(): Promise<Snapshot> {
  const windowId = process.env.AGENT_DESKTOP_WINDOW_ID;
  return desktopCommand<Snapshot>(
    "snapshot",
    ...(windowId ? ["--window-id", windowId] : ["--app", "chromium"]),
    "--compact",
    "--max-depth",
    "25",
    "--timeout-ms",
    "30000",
    "--wait-for",
    "link:Experience",
    "--wait-timeout",
    "30000",
  );
}

const browser = await connectAgentBrowser();
try {
  const page = await browser.currentPage();
  await page.setViewport({ width: 1024, height: 800 });
  await page.goto(process.env.PORTFOLIO_URL ?? "http://localhost:4321/", {
    waitUntil: "domcontentloaded",
  });

  const before = await snapshot();
  assert.equal(before.complete, true, "desktop snapshot must be complete");
  const links = findNodes(before.tree, "link", "Experience").filter(
    (node) => !node.states?.includes("hidden"),
  );
  assert.equal(
    links.length,
    1,
    "experience navigation must have one visible link",
  );
  const ref = links[0]?.ref_id;
  assert.ok(ref, "experience link must have a desktop reference");
  await desktopCommand("click", ref);

  await page.waitForFunction(() => location.hash === "#experience", {
    timeout: 10_000,
  });
  await page.waitForFunction(
    () => {
      const target = document.getElementById("experience");
      return target && target.getBoundingClientRect().top < innerHeight;
    },
    { timeout: 10_000 },
  );
  const after = await snapshot();
  assert.ok(
    findNodes(after.tree, "heading", "Work experience.").length,
    "experience heading must remain accessible after navigation",
  );
  console.log(
    "PASS agent-desktop snapshot, semantic click, and navigation verification",
  );
} finally {
  await browser.disconnect();
}
