import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { startBrowserProxy } from "./browser-proxy";

const upstream = createServer(async (request, response) => {
  if (request.url === "/redirect") {
    response.writeHead(302, { location: "/done" }).end();
    return;
  }
  let body = "";
  for await (const chunk of request) body += chunk;
  response.setHeader("content-type", "application/json");
  response.end(
    JSON.stringify({ url: request.url, origin: request.headers.origin, body }),
  );
});
await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const address = upstream.address();
assert.ok(address && typeof address !== "string");
const upstreamUrl = `http://127.0.0.1:${address.port}/`;
let intercepted = 0;
const proxy = await startBrowserProxy(upstreamUrl, (request, response) => {
  if (request.url === "/unavailable") {
    intercepted++;
    response.writeHead(503).end();
    return true;
  }
  if (request.url === "/network-failure") {
    intercepted++;
    request.socket.destroy();
    return true;
  }
  return false;
});
try {
  const origin = new URL(proxy.url).origin;
  const response = await fetch(new URL("/echo?q=1", proxy.url), {
    method: "POST",
    headers: { origin },
    body: "test body",
  });
  assert.deepEqual(await response.json(), {
    url: "/echo?q=1",
    origin: new URL(upstreamUrl).origin,
    body: "test body",
  });
  const externalOrigin = await fetch(new URL("/echo", proxy.url), {
    headers: { origin: "https://example.org" },
  });
  assert.equal(
    ((await externalOrigin.json()) as { origin: string }).origin,
    "https://example.org",
  );
  const redirect = await fetch(new URL("/redirect", proxy.url), {
    redirect: "manual",
  });
  assert.equal(redirect.headers.get("location"), `${origin}/done`);
  assert.equal((await fetch(new URL("/unavailable", proxy.url))).status, 503);
  await assert.rejects(() => fetch(new URL("/network-failure", proxy.url)));
  assert.ok(intercepted >= 2);
  const badRequest = await new Promise<number | undefined>(
    (resolve, reject) => {
      const request = httpRequest(
        proxy.url,
        { path: "http://example.org/" },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      );
      request.on("error", reject);
      request.end();
    },
  );
  assert.equal(badRequest, 400);
  console.log(
    "PASS browser proxy forwarding, origin checks and simulated failures",
  );
} finally {
  await proxy.close();
  await new Promise<void>((resolve, reject) =>
    upstream.close((error) => (error ? reject(error) : resolve())),
  );
  upstream.closeAllConnections();
}
