import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:4321";
const response = await fetch(base);
assert.equal(response.status, 200);
const html = await response.text();
const tags = html.match(/<meta\b[^>]*>/g) ?? [];
const metadata = (key: string) =>
  tags
    .find(
      (tag) =>
        tag.includes(`property="${key}"`) || tag.includes(`name="${key}"`),
    )
    ?.match(/\bcontent="([^"]*)"/)?.[1];

const image = "https://kinbluu.biz.id/og.png";
assert.equal(metadata("og:image"), image);
assert.equal(metadata("og:image:type"), "image/png");
assert.equal(metadata("og:image:width"), "1200");
assert.equal(metadata("og:image:height"), "630");
assert.ok(metadata("og:image:alt")?.includes("Mochammad Rahmat Muttaqin"));
assert.ok(metadata("og:image:alt")?.includes("Full Stack Developer"));
assert.equal(metadata("twitter:card"), "summary_large_image");
assert.equal(metadata("twitter:image"), image);
assert.equal(metadata("twitter:image:alt"), metadata("og:image:alt"));

const asset = await fetch(new URL(new URL(image).pathname, base));
assert.equal(asset.status, 200);
assert.match(asset.headers.get("content-type") ?? "", /^image\/png/);
const png = Buffer.from(await asset.arrayBuffer());
assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
assert.equal(png.toString("ascii", 12, 16), "IHDR");
assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);
assert.ok(png.byteLength < 1_000_000);
console.log("PASS social preview: absolute URLs, metadata, alt, PNG 1200x630");
