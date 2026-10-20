// Run: bun tests/chat-history.test.ts
import assert from "node:assert/strict";
import { chatLimits, checkHistory } from "../src/lib/chat";

const user = (content: unknown = "Halo") => ({ role: "user", content });

// Legit: tool call without content, tool result, long reply.
assert.equal(
  checkHistory([
    user(),
    { role: "assistant", toolCalls: [] } as { role: string },
    { role: "tool", content: '{"shown":true}' },
    { role: "assistant", content: "a".repeat(3_000) },
    user("Lagi"),
  ]),
  null,
);
assert.equal(checkHistory([{ role: "assistant", content: "x" }]), "invalid");
assert.equal(
  checkHistory([user(), { role: "system", content: "x" }]),
  "invalid",
);
assert.equal(
  checkHistory([user("a".repeat(chatLimits.messageLength + 1))]),
  "message",
);
assert.equal(checkHistory([user("   ")]), "message");
assert.equal(
  checkHistory([user(), { role: "tool", content: "x".repeat(201) }]),
  "length",
);
assert.equal(
  checkHistory([
    user(),
    { role: "assistant", content: "x".repeat(chatLimits.replyLength + 1) },
  ]),
  "length",
);
assert.equal(
  checkHistory(Array.from({ length: chatLimits.turns + 1 }, () => user())),
  "length",
);
assert.equal(
  checkHistory([
    user(),
    ...Array.from({ length: 10 }, () => ({
      role: "assistant",
      content: "x".repeat(7_000),
    })),
  ]),
  "length",
);
console.log("PASS chat history checks");
