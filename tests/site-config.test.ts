import assert from "node:assert/strict";
import config from "../astro.config.mjs";
import snapshot from "../src/data/github-snapshot.json";
import { profile } from "../src/data/profile";
import { chatSystemPrompt } from "../src/lib/chat-prompt";

const github = "https://github.com/kinbluu";

assert.deepEqual(
  {
    site: config.site,
    username: config.env?.schema?.GITHUB_USERNAME.default,
    contact: profile.github,
    fallback: snapshot.login,
  },
  {
    site: "https://kinbluu.biz.id/",
    username: "kinbluu",
    contact: github,
    fallback: "kinbluu",
  },
);
assert.ok(chatSystemPrompt.includes(`GitHub: ${github}`));
console.log("PASS production site identity");
