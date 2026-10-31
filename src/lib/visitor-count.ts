function validCount(count: unknown): count is number {
  return typeof count === "number" && Number.isSafeInteger(count) && count >= 0;
}

export async function getVisitorCount(db: D1Database): Promise<number> {
  const count = await db
    .prepare("SELECT total FROM visitor_count WHERE id = 1")
    .first<number>("total");
  if (!validCount(count)) throw new Error("Visitor count is unavailable");
  return count;
}

export async function recordVisitor(
  db: D1Database,
  visitorId: string,
): Promise<number> {
  const [, result] = await db.batch<{ total: number }>([
    db
      .prepare(
        "INSERT INTO visitors (id) VALUES (?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(visitorId),
    db.prepare("SELECT total FROM visitor_count WHERE id = 1"),
  ]);
  const count = result.results[0]?.total;
  if (!validCount(count)) throw new Error("Visitor count is unavailable");
  return count;
}
