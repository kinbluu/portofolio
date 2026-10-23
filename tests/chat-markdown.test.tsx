// Run: bun tests/chat-markdown.test.tsx
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMarkdown } from "../src/components/ChatPanel";
import { allowedChatLink } from "../src/lib/chat";

const email = "rahmat@example.com";
const github = "https://github.com/kinkenkan298";
const linkedin = "https://www.linkedin.com/in/rahmat";
const contacts = { email, github, linkedin };
const ok = (href: string) => allowedChatLink(href, contacts) !== null;

assert.ok(ok("#work"));
assert.ok(ok(`mailto:${email}`));
assert.ok(ok(github));
assert.ok(ok(`${github}/repo`));
assert.equal(allowedChatLink(`${github}/./repo`, contacts), `${github}/repo`);
assert.ok(!ok("#evil"));
assert.ok(!ok("mailto:attacker@example.com"));
assert.ok(!ok("https://github.com/kinkenkan298.evil.com"));
assert.ok(!ok("https://github.com/kinkenkan2980"));
assert.ok(!ok("https://evil.com"));
assert.ok(!ok("javascript:alert(1)"));
// Path traversal: browsers normalize these to another account.
assert.ok(!ok(`${github}/../attacker`));
assert.ok(!ok(`${github}/%2e%2e/attacker`));
assert.ok(!ok(`${github}/%2E%2e/attacker`));
assert.ok(!ok(`${github}\\..\\attacker`));
assert.ok(!ok(`${github}/repo/../../attacker`));
assert.ok(!ok("https://user:pass@github.com/kinkenkan298"));
assert.ok(!ok("http://github.com/kinkenkan298"));
assert.ok(ok(linkedin));
assert.ok(ok(`${linkedin}/`));
assert.ok(!ok(`${linkedin}/../attacker`));
assert.ok(!ok(`${linkedin}/detail/contact-info`));
assert.ok(!ok("https://www.linkedin.com/in/rahmat-evil"));
assert.ok(!ok("https://linkedin.com.evil.com/in/rahmat"));
assert.ok(!ok("https://www.linkedin.com/in/attacker"));

const html = renderToStaticMarkup(
  <ChatMarkdown
    content={`[GitHub](${github}) [LinkedIn](${linkedin}) [Hubungi](https://evil.com) ![foto](https://evil.com/track.png)`}
    contacts={contacts}
  />,
);
assert.ok(html.includes(`href="${github}"`), html);
assert.ok(html.includes(`href="${linkedin}"`), html);
assert.ok(!html.includes("evil.com"), html);
assert.ok(!html.includes("<img"), html);
assert.ok(html.includes("foto"), html);
console.log("PASS chat markdown guardrails");
