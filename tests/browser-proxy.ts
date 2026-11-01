import { createServer, request as httpRequest } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { request as httpsRequest } from "node:https";

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
) => boolean | Promise<boolean>;

export async function startBrowserProxy(upstreamUrl: string, handler: Handler) {
  const upstream = new URL(upstreamUrl);
  if (
    !["http:", "https:"].includes(upstream.protocol) ||
    upstream.username ||
    upstream.password
  ) {
    throw new Error(
      "Browser test proxy requires an HTTP(S) upstream without credentials.",
    );
  }
  let proxyOrigin = "";
  const server = createServer((incoming, outgoing) => {
    void (async () => {
      if (await handler(incoming, outgoing)) return;
      const target = new URL(incoming.url ?? "/", upstream);
      if (target.origin !== upstream.origin) {
        outgoing.writeHead(400).end();
        return;
      }
      const headers = { ...incoming.headers, host: target.host };
      if (headers.origin === proxyOrigin) headers.origin = upstream.origin;
      const request = (
        target.protocol === "https:" ? httpsRequest : httpRequest
      )(target, { method: incoming.method, headers }, (response) => {
        const responseHeaders = { ...response.headers };
        if (responseHeaders.location) {
          const location = new URL(responseHeaders.location, target);
          if (location.origin === upstream.origin) {
            responseHeaders.location = `${proxyOrigin}${location.pathname}${location.search}${location.hash}`;
          }
        }
        outgoing.writeHead(response.statusCode ?? 502, responseHeaders);
        response.pipe(outgoing);
      });
      request.on("error", () => {
        if (!outgoing.headersSent && !outgoing.destroyed)
          outgoing.writeHead(502).end();
        else outgoing.destroy();
      });
      incoming.on("aborted", () => request.destroy());
      incoming.pipe(request);
    })().catch(() => {
      if (!outgoing.headersSent && !outgoing.destroyed)
        outgoing.writeHead(500).end();
      else outgoing.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Browser test proxy did not get a TCP port.");
  }
  proxyOrigin = `http://127.0.0.1:${address.port}`;
  return {
    url: new URL(`${upstream.pathname}${upstream.search}`, proxyOrigin).href,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
