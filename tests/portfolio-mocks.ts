import { startBrowserProxy } from "./browser-proxy";

export type PortfolioMockState = {
  chatScenario: "text" | "show-section";
  chatRequests: number;
  islandFailure: "http" | "network" | null;
  islandRequests: number;
};

export async function startPortfolioMockServer(upstreamUrl: string) {
  const state: PortfolioMockState = {
    chatScenario: "text",
    chatRequests: 0,
    islandFailure: null,
    islandRequests: 0,
  };
  const proxy = await startBrowserProxy(
    upstreamUrl,
    async (request, response) => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path === "/api/chat") {
        let body = "";
        for await (const chunk of request) {
          body += chunk;
          if (body.length > 1024 * 1024) {
            response.writeHead(413).end();
            return true;
          }
        }
        let payload: { threadId?: string; runId?: string };
        try {
          payload = JSON.parse(body) as typeof payload;
        } catch {
          response.writeHead(400).end();
          return true;
        }
        state.chatRequests++;
        const { threadId = "test", runId = "test" } = payload;
        const timestamp = Date.now();
        const events =
          state.chatScenario === "show-section" && state.chatRequests === 1
            ? [
                { type: "RUN_STARTED", threadId, runId, timestamp },
                {
                  type: "TOOL_CALL_START",
                  toolCallId: "call_1",
                  toolCallName: "show_section",
                  timestamp,
                },
                {
                  type: "TOOL_CALL_ARGS",
                  toolCallId: "call_1",
                  delta: JSON.stringify({ section: "experience" }),
                  timestamp,
                },
                { type: "TOOL_CALL_END", toolCallId: "call_1", timestamp },
                { type: "RUN_FINISHED", threadId, runId, timestamp },
              ]
            : [
                { type: "RUN_STARTED", threadId, runId, timestamp },
                {
                  type: "TEXT_MESSAGE_START",
                  messageId: "test",
                  role: "assistant",
                  timestamp,
                },
                {
                  type: "TEXT_MESSAGE_CONTENT",
                  messageId: "test",
                  delta:
                    state.chatScenario === "text"
                      ? "This is a test response."
                      : "Here is his experience.",
                  timestamp,
                },
                { type: "TEXT_MESSAGE_END", messageId: "test", timestamp },
                { type: "RUN_FINISHED", threadId, runId, timestamp },
              ];
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.end(
          events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
        );
        return true;
      }
      if (path.startsWith("/_server-islands/") && state.islandFailure) {
        state.islandRequests++;
        if (state.islandFailure === "network") request.socket.destroy();
        else response.writeHead(503).end();
        return true;
      }
      return false;
    },
  );
  return { ...proxy, state };
}
