// Run: bun tests/chat-launcher.test.ts
import assert from "node:assert/strict";
import { launcherHidden } from "../src/scripts/chat-launcher";

assert.equal(launcherHidden(300, 304, false), undefined, "jitter keeps state");
assert.equal(launcherHidden(300, 400, false), true, "scrolling down hides");
assert.equal(launcherHidden(400, 300, false), false, "scrolling up shows");
assert.equal(launcherHidden(0, 150, false), false, "near top stays visible");
assert.equal(
  launcherHidden(300, 400, true),
  false,
  "open panel keeps launcher",
);

console.log("PASS chat launcher scroll");
