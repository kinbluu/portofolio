import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4322";
const origin = "https://kinbluu.biz.id";
const paths = ["/", "/about", "/contact", "/privacy"];
const textContent = (html: string) =>
  html
    .replace(/<(head|script|style|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const request = (path: string, accept: string, method = "GET") =>
  fetch(new URL(path, base), { headers: { Accept: accept }, method });
const varies = (response: Response) =>
  assert.ok(
    response.headers
      .get("vary")
      ?.toLowerCase()
      .split(/\s*,\s*/)
      .includes("accept"),
    "Vary must include Accept",
  );

for (const path of paths) {
  test(`${path} negotiates Markdown and HTML with complete raw content`, async () => {
    const md = await request(path, "text/markdown");
    assert.equal(md.status, 200);
    assert.match(md.headers.get("content-type") ?? "", /^text\/markdown\b/);
    varies(md);
    const markdown = await md.text();
    assert.match(markdown, /^# /);
    assert.ok(markdown.length >= 500);
    const html = await request(path, "text/html");
    assert.equal(html.status, 200);
    assert.match(html.headers.get("content-type") ?? "", /^text\/html\b/);
    varies(html);
    const body = await html.text();
    assert.match(body, /<html\b[^>]*lang="en"/);
    assert.equal((body.match(/<h1\b/g) ?? []).length, 1);
    const headings = [...body.matchAll(/<h([1-6])\b/g)].map((match) =>
      Number(match[1]),
    );
    headings.forEach((heading, index) =>
      assert.ok(heading <= (headings[index - 1] ?? 0) + 1),
    );
    assert.ok(
      textContent(body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "")
        .length >= 500,
    );
    assert.match(
      body,
      new RegExp(`<link rel="canonical" href="${origin}${path}"`),
    );
    assert.ok(body.includes(`property="og:image" content="${origin}/og.png"`));
    assert.match(body, /property="og:type"/);
    const person = JSON.parse(
      body.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )?.[1] ?? "{}",
    );
    assert.equal(person["@type"], "Person");
    assert.equal(person.url, `${origin}/`);
    assert.ok(person.description?.length > 20);
    if (path === "/" && process.env.CHECK_CONTENT_RATIO === "1") {
      const text = textContent(body);
      const ratio = text.length / body.length;
      console.log(
        JSON.stringify({ html: body.length, text: text.length, ratio }),
      );
      assert.ok(ratio >= 0.05, `Raw HTML text ratio ${ratio} is below 5%`);
      assert.ok((body.match(/data-slot="skeleton"/g) ?? []).length < 30);
    }
    const alias = await request(
      path === "/" ? "/index.md" : `${path}.md`,
      "*/*",
    );
    assert.equal(alias.status, 200);
    assert.match(alias.headers.get("content-type") ?? "", /^text\/markdown\b/);
    assert.equal(await alias.text(), markdown);
    const head = await request(path, "text/markdown", "HEAD");
    assert.equal(head.status, 200);
    assert.match(head.headers.get("content-type") ?? "", /^text\/markdown\b/);
    varies(head);
    assert.equal(await head.text(), "");
  });
}

for (const [accept, expected] of [
  ["*/*", "text/html"],
  ["text/*", "text/html"],
  ["text/markdown;q=0, text/html", "text/html"],
  ["text/markdown;q=0.2, text/html;q=0.9", "text/html"],
  ["text/html;q=0.2, text/markdown;q=0.9", "text/markdown"],
  ["text/html;q=0, */*;q=0.5", "text/markdown"],
  ["TEXT/MARKDOWN", "text/markdown"],
  ["text/markdown; charset=utf-8", "text/markdown"],
  ["application/json", null],
  ["text/html;q=0, text/markdown;q=0", null],
] as const) {
  test(`homepage respects Accept ${accept}`, async () => {
    const response = await request("/", accept);
    assert.equal(response.status, expected ? 200 : 406);
    varies(response);
    if (expected)
      assert.ok(response.headers.get("content-type")?.startsWith(expected));
  });
}

for (const path of ["/__ora-404-probe-fix", "/nested/missing", "/missing.md"]) {
  test(`${path} keeps 404 and explains it in Markdown`, async () => {
    const response = await request(path, "text/markdown");
    assert.equal(response.status, 404);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/markdown\b/,
    );
    varies(response);
    const body = await response.text();
    assert.ok(body.length > 20);
    assert.match(body, /\[[^\]]+\]\([^)]*(llms\.txt|sitemap\.xml)[^)]*\)/);
    const html = await request(path, "text/html");
    assert.equal(html.status, 404);
    assert.match(html.headers.get("content-type") ?? "", /^text\/html\b/);
  });
}

test("sitemap, robots and llms.txt form a crawlable public index", async () => {
  const sitemap = await request("/sitemap.xml", "application/xml");
  assert.equal(sitemap.status, 200);
  assert.match(
    sitemap.headers.get("content-type") ?? "",
    /^(application|text)\/xml\b/,
  );
  const xml = await sitemap.text();
  assert.ok(xml.length < 50_000_000);
  assert.match(
    xml,
    /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/,
  );
  const urls = [
    ...xml.matchAll(
      /<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g,
    ),
  ];
  assert.deepEqual(
    urls.map((match) => match[1]),
    paths.map((path) => `${origin}${path}`),
  );
  for (const match of urls)
    assert.ok(
      Number.isFinite(Date.parse(match[2]!)) &&
        Date.parse(match[2]!) <= Date.now(),
    );
  const robots = await request("/robots.txt", "text/plain");
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get("content-type") ?? "", /^text\/plain\b/);
  assert.ok((await robots.text()).includes(`Sitemap: ${origin}/sitemap.xml`));
  const llms = await request("/llms.txt", "*/*");
  assert.equal(llms.status, 200);
  assert.match(llms.headers.get("content-type") ?? "", /^text\/plain\b/);
  const guide = await llms.text();
  assert.match(guide, /^# Mochammad Rahmat Muttaqin\n\n> /);
  assert.match(guide, /## When to use this/);
  assert.match(guide, /Accept: text\/markdown/);
  assert.match(guide, /Laravel|Node\.js/);
  for (const section of guide.split(/^## /m).slice(1)) {
    const lines = section.trim().split("\n").slice(1).filter(Boolean);
    assert.ok(
      lines.every((line) => /^- \[[^\]]+\]\(https?:\/\/[^)]+\)/.test(line)),
    );
  }
  for (const match of guide.matchAll(
    /\]\((https:\/\/kinbluu\.biz\.id[^)]*)\)/g,
  )) {
    const linked = await request(new URL(match[1]!).pathname, "*/*");
    assert.equal(linked.status, 200, match[1]);
  }
});

test("API validation is not converted to a Markdown page", async () => {
  const response = await fetch(new URL("/api/chat", base), {
    method: "POST",
    headers: { Accept: "text/markdown", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 400);
  assert.notEqual(
    response.headers.get("content-type"),
    "text/markdown; charset=utf-8",
  );
});
