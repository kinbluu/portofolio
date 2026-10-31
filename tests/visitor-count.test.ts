import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { getVisitorCount, recordVisitor } from "../src/lib/visitor-count";
import { isVisitorId } from "../src/lib/visitor-id";

const mf = new Miniflare({
  cf: false,
  workers: [
    {
      config: {
        name: "visitor-count-test",
        compatibilityDate: "2026-10-12",
        manifest: {
          mainModule: "index.js",
          modules: {
            "index.js": {
              type: "esm",
              contents: 'export default { fetch: () => new Response("ok") }',
            },
          },
        },
        env: {
          VISITOR_DB: { type: "d1", id: "visitor-count-test" },
          EMPTY_DB: { type: "d1", id: "empty-test" },
        },
      },
    },
  ],
});

try {
  const db = (await mf.getD1Database("VISITOR_DB")) as unknown as D1Database;
  const emptyDb = (await mf.getD1Database("EMPTY_DB")) as unknown as D1Database;
  const migration = await readFile("migrations/0001_visitor_count.sql", "utf8");
  await db.exec(migration);

  assert.equal(await getVisitorCount(db), 0);
  await assert.rejects(() => getVisitorCount(emptyDb));
  await assert.rejects(() => recordVisitor(emptyDb, crypto.randomUUID()));

  const firstId = crypto.randomUUID();
  assert.equal(isVisitorId(firstId), true);
  for (const invalid of [
    null,
    "",
    "not-a-uuid",
    "ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF",
    `${firstId}x`,
  ]) {
    assert.equal(isVisitorId(invalid), false);
  }

  const duplicateCounts = await Promise.all(
    Array.from({ length: 20 }, () => recordVisitor(db, firstId)),
  );
  assert.ok(duplicateCounts.every((count) => count === 1));
  assert.equal(await getVisitorCount(db), 1);

  const additionalIds = Array.from({ length: 20 }, () => crypto.randomUUID());
  await Promise.all(additionalIds.map((id) => recordVisitor(db, id)));
  assert.equal(await getVisitorCount(db), 21);
  assert.equal(await recordVisitor(db, firstId), 21);
  console.log(
    "PASS visitor count: migrations, concurrent uniqueness, validation, and unavailable database",
  );
} finally {
  await mf.dispose();
}
