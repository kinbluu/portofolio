import { chat, chatParamsFromRequestBody, EventType, toServerSentEventsResponse, type RunErrorEvent } from "@tanstack/ai";
import { createGeminiChat } from "@tanstack/ai-gemini";
import type { APIRoute } from "astro";
import { GEMINI_API_KEY } from "astro:env/server";
import { env } from "cloudflare:workers";
import { chatLimits, chatRejectedCode, chatTools } from "../../lib/chat";
import { chatSystemPrompt } from "../../lib/chat-prompt";

export const prerender = false;

const allowedRoles = new Set(["user", "assistant", "tool", "reasoning"]);

const badRequest = (status: 400 | 413) => new Response(null, { status });

const isTextWithinLimit = (content: unknown) =>
  typeof content === "string" && content.trim().length > 0 && content.length <= chatLimits.messageLength;

async function* rejection(event: Omit<RunErrorEvent, "type" | "code" | "timestamp">) {
  yield { ...event, type: EventType.RUN_ERROR, code: chatRejectedCode, timestamp: Date.now() } satisfies RunErrorEvent;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (Number(request.headers.get("content-length")) > chatLimits.requestSize) return badRequest(413);
  const body = await request.text();
  if (body.length > chatLimits.requestSize) return badRequest(413);

  let params: Awaited<ReturnType<typeof chatParamsFromRequestBody>>;
  try {
    params = await chatParamsFromRequestBody(JSON.parse(body));
  } catch {
    return badRequest(400);
  }

  const { messages, threadId, runId } = params;
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length === 0 || messages.some((message) => !allowedRoles.has(message.role))) {
    return badRequest(400);
  }

  const reject = (message: string) => toServerSentEventsResponse(rejection({ threadId, runId, message }));

  if (!GEMINI_API_KEY) return reject("Asisten belum siap digunakan. Silakan coba lagi nanti.");

  const { success } = await env.CHAT_RATE_LIMITER.limit({ key: clientAddress });
  if (!success) return reject("Terlalu banyak pesan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.");

  if (userMessages.length > chatLimits.turns) {
    return reject("Percakapan sudah mencapai batas. Mulai percakapan baru untuk lanjut.");
  }
  if (!userMessages.every((message) => "content" in message && isTextWithinLimit(message.content))) {
    return reject(`Pesan harus berupa teks, maksimal ${chatLimits.messageLength} karakter.`);
  }

  const abortController = new AbortController();
  const stream = chat({
    adapter: createGeminiChat("gemini-3.8-flash", GEMINI_API_KEY),
    messages,
    threadId,
    runId,
    systemPrompts: [chatSystemPrompt],
    tools: chatTools,
    reasoning: "low",
    modelOptions: { maxOutputTokens: 1024 },
    abortController,
  });

  return toServerSentEventsResponse(stream, { abortController });
};
