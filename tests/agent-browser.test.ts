import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AgentBrowser } from "./agent-browser";

const directory = await mkdtemp(
  join(process.env.EMPRYO_TMP ?? tmpdir(), "agent-browser-test-"),
);
const originalCommand = process.env.AGENT_BROWSER_BIN;
try {
  const command = join(directory, "agent-browser");
  await writeFile(
    command,
    `#!/usr/bin/env node
(async () => {
  const args = process.argv.slice(2);
  const values = args.slice(args.indexOf('--json') + 1);
  if (values[0] === 'fail') {
    process.stdout.write(JSON.stringify({success: false, error: 'refused'}));
    process.exitCode = 1;
  } else if (values[0] === 'invalid') {
    process.stdout.write('not-json');
  } else if (values[0] === 'get' && values[1] === 'cdp-url') {
    process.stdout.write(JSON.stringify({success: true, data: {cdpUrl: 'ws://127.0.0.1:9222/devtools/browser/test'}}));
  } else if (values[0] === 'tab' && values[1] === 'list') {
    process.stdout.write(JSON.stringify({success: true, data: {tabs: [{tabId: 't1'}]}}));
  } else if (values[0] === 'eval') {
    const expression = Buffer.from(values[2], 'base64').toString();
    const result = expression === 'window.close()' ? null : await eval(expression);
    process.stdout.write(JSON.stringify({success: true, data: {result}}));
  } else if (values[0] === 'tab' && values[1] === 'new') {
    process.stdout.write(JSON.stringify({success: true, data: {tabId: 't2'}}));
  } else {
    process.stdout.write(JSON.stringify({success: true, data: {args: values}}));
  }
})();
`,
    { mode: 0o700 },
  );
  process.env.AGENT_BROWSER_BIN = command;
  const browser = new AgentBrowser();
  assert.deepEqual(await browser.command("echo", "a; literal"), {
    args: ["echo", "a; literal"],
  });
  await assert.rejects(
    () => browser.connect("http://example.com:9222"),
    /loopback/,
  );
  await assert.rejects(() => browser.command("fail"), /refused/);
  await assert.rejects(() => browser.command("invalid"), /invalid JSON/);
  await assert.rejects(
    () => browser.connect("http://127.0.0.1:9223"),
    /different browser endpoint/,
  );
  await browser.connect("http://127.0.0.1:9222");
  await browser.closeOwnedBrowser();
  const page = await browser.newPage();
  assert.equal(await page.evaluate((a, b) => a + b, 2, 3), 5);
  await page.waitForFunction(
    (value) => value === "ready",
    { timeout: 100 },
    "ready",
  );
  await page.close();
  await browser.disconnect();
  console.log(
    "PASS agent-browser command handling, evaluation and endpoint validation",
  );
} finally {
  if (originalCommand === undefined) delete process.env.AGENT_BROWSER_BIN;
  else process.env.AGENT_BROWSER_BIN = originalCommand;
  await rm(directory, { recursive: true, force: true });
}
