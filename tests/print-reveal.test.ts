// Run with the dev server running: bun tests/print-reveal.test.ts
// Requires Chromium on PATH. Guards that print overrides cover every element the reveal hides.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

// Waits for the late server-island cells to be hidden by the reveal, then checks that a
// `!important` opacity rule inside @media print matches each hidden element.
const probe = `<script>
  const hidden = () => [...document.querySelectorAll('[data-reveal], [data-reveal-cells] > *')]
    .filter((element) => element.style.opacity === '0');
  // The print rule sits inside @layer base, so walk nested rules instead of only the top level.
  const flatten = (rules) => [...rules].flatMap((rule) => [rule, ...(rule.cssRules ? flatten(rule.cssRules) : [])]);
  const printRules = () => [...document.styleSheets]
    .flatMap((sheet) => flatten(sheet.cssRules))
    .filter((rule) => rule.media?.mediaText === 'print')
    .flatMap((media) => flatten(media.cssRules))
    .filter((rule) => rule.style?.getPropertyValue('opacity') === '1' && rule.style.getPropertyPriority('opacity') === 'important');
  const inspect = () => {
    // One of the two calendar grids is display:none per viewport and is never hidden by the reveal.
    const cells = [...document.querySelectorAll('[data-reveal-cells] > *')].filter((cell) => cell.style.opacity === '0');
    if (!cells.length) return;
    const rules = printRules();
    const uncovered = hidden().filter((element) => !rules.some((rule) => element.matches(rule.selectorText)));
    const report = document.createElement('script');
    report.id = 'print-reveal-check';
    report.type = 'application/json';
    report.textContent = JSON.stringify({ cells: cells.length, uncovered: uncovered.length });
    document.body.append(report);
    observer.disconnect();
  };
  const observer = new MutationObserver(inspect);
  addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    inspect();
  });
</script>`;

const origin = process.env.PORTFOLIO_URL ?? "http://localhost:4321";
const profile = await mkdtemp(join(tmpdir(), "portfolio-print-check-"));
const proxy = createServer(async (request, response) => {
  try {
    const upstream = await fetch(new URL(request.url ?? "/", origin));
    const type =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    response.writeHead(upstream.status, { "Content-Type": type });
    response.end(
      type.includes("text/html")
        ? (await upstream.text()).replace("</body>", `${probe}</body>`)
        : Buffer.from(await upstream.arrayBuffer()),
    );
  } catch {
    response.writeHead(502).end();
  }
});

try {
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  assert(address && typeof address !== "string");
  const { stdout }: { stdout: string } = await promisify(execFile)(
    "chromium",
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-background-networking",
      `--user-data-dir=${profile}`,
      "--dump-dom",
      "--virtual-time-budget=15000",
      `http://127.0.0.1:${address.port}/`,
    ],
    { timeout: 45_000, maxBuffer: 4 * 1024 * 1024 },
  );
  const report = stdout.match(
    /<script id="print-reveal-check" type="application\/json">(.*?)<\/script>/,
  )?.[1];
  assert(report, "browser must hide the calendar cells before the check runs");
  const state = JSON.parse(report);
  assert(state.cells > 0, "calendar cells must be hidden by the reveal");
  assert.equal(
    state.uncovered,
    0,
    "print override must cover every hidden element",
  );
  console.log("PASS print override covers every element the reveal hides");
} finally {
  proxy.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    proxy.close((error) => (error ? reject(error) : resolve())),
  );
  await rm(profile, { recursive: true, force: true });
}
