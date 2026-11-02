import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { desktopCommand, DesktopCommandError } from "./desktop-browser";
import { desktopEndpoint } from "./desktop-endpoint";

for (const endpoint of [
  "",
  "https://127.0.0.1:9222",
  "http://example.com:9222",
  "http://127.0.0.1:9222/path",
  "http://user:password@127.0.0.1:9222",
  "http://127.0.0.1:9222/?query=1",
]) {
  assert.throws(() => desktopEndpoint(endpoint));
}

const directory = await mkdtemp(
  join(process.env.EMPRYO_TMP ?? tmpdir(), "desktop-command-test-"),
);
const originalCommand = process.env.AGENT_DESKTOP_BIN;
try {
  const command = join(directory, "agent-desktop");
  await writeFile(
    command,
    `#!/usr/bin/env node
const action = process.argv[2];
if (action === "status") {
  process.stdout.write(JSON.stringify({ok: true, data: {platform: "test", arg: process.argv[3]}}));
} else if (action === "invalid") {
  process.stdout.write("not-json");
} else {
  process.stdout.write(JSON.stringify({ok: false, error: {code: "REFUSED", message: "not delivered", disposition: {delivery: action}}}));
  process.exitCode = 1;
}
`,
    { mode: 0o700 },
  );
  process.env.AGENT_DESKTOP_BIN = command;
  assert.deepEqual(await desktopCommand("status", "a; literal"), {
    platform: "test",
    arg: "a; literal",
  });
  for (const delivery of ["not_delivered", "delivered_unverified"]) {
    await assert.rejects(
      () => desktopCommand(delivery),
      (error) =>
        error instanceof DesktopCommandError &&
        error.delivery === delivery &&
        error.message.includes("REFUSED"),
    );
  }
  await assert.rejects(
    () => desktopCommand("invalid"),
    (error) => error instanceof DesktopCommandError && !error.delivery,
  );
  console.log(
    "PASS agent-desktop command handling and loopback endpoint validation",
  );
} finally {
  if (originalCommand === undefined) delete process.env.AGENT_DESKTOP_BIN;
  else process.env.AGENT_DESKTOP_BIN = originalCommand;
  await rm(directory, { recursive: true, force: true });
}
