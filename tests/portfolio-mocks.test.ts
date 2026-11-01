import assert from "node:assert/strict";
import { createServer } from "node:http";
import { startPortfolioMockServer } from "./portfolio-mocks";

let upstreamCalls = 0;
const upstream = createServer((_request, response) => {
  upstreamCalls++;
  response.end("upstream");
});
await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const address = upstream.address();
assert.ok(address && typeof address !== "string");
const mock = await startPortfolioMockServer(
  `http://127.0.0.1:${address.port}/`,
);
try {
  const chat = await fetch(new URL("/api/chat", mock.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threadId: "thread-1", runId: "run-1" }),
  });
  assert.equal(chat.status, 200);
  assert.match(chat.headers.get("content-type") ?? "", /^text\/event-stream/);
  const text = await chat.text();
  assert.match(text, /"threadId":"thread-1"/);
  assert.match(text, /"runId":"run-1"/);
  assert.match(text, /This is a test response/);
  assert.equal(mock.state.chatRequests, 1);
  assert.equal(upstreamCalls, 0);

  mock.state.chatScenario = "show-section";
  mock.state.chatRequests = 0;
  const send = () =>
    fetch(new URL("/api/chat", mock.url), {
      method: "POST",
      body: JSON.stringify({ threadId: "t", runId: "r" }),
    }).then((response) => response.text());
  assert.match(await send(), /"toolCallName":"show_section"/);
  assert.match(await send(), /Here is his experience/);
  assert.equal(mock.state.chatRequests, 2);
  assert.equal(upstreamCalls, 0);

  mock.state.islandFailure = "http";
  assert.equal(
    (await fetch(new URL("/_server-islands/example", mock.url))).status,
    503,
  );
  mock.state.islandFailure = "network";
  await assert.rejects(() =>
    fetch(new URL("/_server-islands/example", mock.url)),
  );
  assert.ok(mock.state.islandRequests >= 2);
  assert.equal(
    await (await fetch(new URL("/other", mock.url))).text(),
    "upstream",
  );
  assert.equal(upstreamCalls, 1);
  console.log("PASS portfolio proxy chat streams and island failure scenarios");
} finally {
  await mock.close();
  await new Promise<void>((resolve, reject) => {
    upstream.close((error) => (error ? reject(error) : resolve()));
    upstream.closeAllConnections();
  });
}
