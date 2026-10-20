// Run with the dev server running: bun tests/github-island-failure.test.ts
// Requires Chromium on PATH. Guards against infinite loading when a server island fails.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const probe = `<script>
  customElements.whenDefined("github-calendar-fallback").then(() => {
    const loading = document.querySelector("[data-github-loading]");
    const startedLoading = loading && getComputedStyle(loading).display !== "none";
    const inspect = () => {
      if (document.querySelector("[data-github-loading]")) return;
      const error = document.querySelector("[data-github-error]");
      const report = document.createElement("script");
      report.id = "github-failure-check";
      report.type = "application/json";
      report.textContent = JSON.stringify({
        startedLoading,
        loading: !!document.querySelector("[data-github-loading]"),
        errorVisible: !!error && getComputedStyle(error).display !== "none",
        href: error?.querySelector("a")?.href,
      });
      document.body.append(report);
      observer.disconnect();
    };
    const observer = new MutationObserver(inspect);
    observer.observe(document.querySelector("github-calendar-fallback"), { childList: true, subtree: true, attributes: true });
    inspect();
  });
</script>`;

const origin = process.env.PORTFOLIO_URL ?? "http://localhost:4321";
const profile = await mkdtemp(join(tmpdir(), "portfolio-island-check-"));
let failure: "http" | "network" = "http";
let blocked = 0;
const proxy = createServer(async (request, response) => {
  if (request.url?.startsWith("/_server-islands/")) {
    blocked++;
    if (failure === "network") response.destroy();
    else response.writeHead(503).end();
    return;
  }
  try {
    const upstream = await fetch(new URL(request.url ?? "/", origin));
    response.writeHead(upstream.status, {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
    });
    if (upstream.headers.get("content-type")?.includes("text/html")) {
      response.end(
        (await upstream.text()).replace("</body>", `${probe}</body>`),
      );
    } else {
      response.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch {
    response.writeHead(502).end();
  }
});

try {
  await new Promise<void>((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const address = proxy.address();
  assert(address && typeof address !== "string");
  for (failure of ["http", "network"] as const) {
    blocked = 0;
    const { stdout }: { stdout: string } = await promisify(execFile)(
      "chromium",
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-background-networking",
        `--user-data-dir=${profile}`,
        "--dump-dom",
        // Advance Chromium's virtual clock; the probe awaits DOM changes, not a timed sleep.
        "--virtual-time-budget=15000",
        `http://127.0.0.1:${address.port}/`,
      ],
      { timeout: 45_000, maxBuffer: 4 * 1024 * 1024 },
    );
    assert(blocked > 0, `${failure}: the real island request must be blocked`);
    const report: string | undefined = stdout.match(
      /<script id="github-failure-check" type="application\/json">(.*?)<\/script>/,
    )?.[1];
    assert(report, `${failure}: browser must complete the failure-state check`);
    const state = JSON.parse(report);
    assert.equal(
      state.startedLoading,
      true,
      `${failure}: skeleton must be shown initially`,
    );
    assert.equal(state.loading, false, `${failure}: loading must end`);
    assert.equal(
      state.errorVisible,
      true,
      `${failure}: error state must be visible`,
    );
    assert.match(
      state.href,
      /^https:\/\/github\.com\/[^/]+$/,
      `${failure}: recovery link stays usable`,
    );
  }
  console.log(
    "PASS GitHub island HTTP and network failures leave loading state",
  );
} finally {
  proxy.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    proxy.close((error) => (error ? reject(error) : resolve())),
  );
  await rm(profile, { recursive: true, force: true });
}
