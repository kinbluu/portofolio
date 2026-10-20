// Run: bun tests/github-cache.test.ts
import assert from "node:assert/strict";

// No @types/bun in this project; declare only the slice used here.
declare const Bun: {
  plugin(options: {
    setup(build: { module(id: string, load: () => { exports: Record<string, unknown>; loader: "object" }): void }): void;
  }): void;
};

// github.ts imports an Astro virtual module; stub it before loading.
// Dynamic import: static imports are hoisted above Bun.plugin, so the stub would register too late.
Bun.plugin({
  setup: (build) => build.module("astro:env/server", () => ({ exports: { GITHUB_USERNAME: "test" }, loader: "object" })),
});
const { getContributionCalendar } = await import("../src/lib/github");

let now = 0;
Date.now = () => now;
let upstream: number | "down" = "down";
let calls = 0;
globalThis.fetch = (async () => {
  calls++;
  if (upstream === "down") return new Response("", { status: 503 });
  return Response.json({ total: {}, contributions: [{ date: "2026-10-20", count: upstream, level: 1 }] });
}) as typeof fetch;
console.warn = () => {};

const count = async () => (await getContributionCalendar()).days.at(-1)?.count;
const snapshotCount = await count();

upstream = 5;
assert.equal(await count(), 5, "first failure is not cached: next request retries upstream");

upstream = 9;
now += 59 * 60_000;
assert.equal(await count(), 5, "within TTL: served from cache");
now += 60_000;
assert.equal(await count(), 9, "after TTL: refetched");

upstream = "down";
now += 60 * 60_000;
assert.equal(await count(), snapshotCount, "upstream down: snapshot fallback");
upstream = 11;
assert.equal(await count(), 11, "recovers on the next request");
assert.equal(calls, 5);

console.log("PASS github calendar cache");
