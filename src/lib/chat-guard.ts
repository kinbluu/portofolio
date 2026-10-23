import {
  EventType,
  type ChatMiddleware,
  type ModelMessage,
  type StreamChunk,
} from "@tanstack/ai";
import type { z } from "zod";
import { chatTools } from "./chat";
import { chatRefusal, chatRules } from "./chat-prompt";

type Rule = readonly [name: string, pattern: RegExp];

const firstMatch = (rules: readonly Rule[], text: string) =>
  rules.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

const warn = (stage: string, rule: string, evidence = "") =>
  console.warn(
    `[chat-guard] ${stage} blocked: ${rule}${evidence && ` ${JSON.stringify(evidence)}`}`,
  );

const invisible =
  /[^\P{Cc}\n\t]|[\p{Cf}\p{Co}\u{FE00}-\u{FE0F}\u{E0100}-\u{E01EF}]/gu;

/** NFKC plus no control, format, private-use or variation-selector characters: the hiding places for smuggled instructions. */
export const cleanVisitorText = (text: string) =>
  text.normalize("NFKC").replace(invisible, "");

const injectionRules: Rule[] = [
  [
    "role-marker",
    /(^|\n)[\s#*>[(]*(system|sistem|developer|admin(istrator)?|root|operator)(\s+(update|override|message|prompt|note|notice|instructions?|mode|alert|warning|pesan|pembaruan|perintah|instruksi|catatan|peringatan))?[\s\])*]*:/i,
  ],
  [
    "fake-turn",
    /(^|\n)[\s#*>[(]*(assistant|asisten|ai|bot|chatbot|model|user|pengguna|human)[\s\])*]*:/i,
  ],
  [
    "markup",
    /<\s*\/?\s*(system|sistem|developer|admin|assistant|asisten|user|instructions?|instruksi|pesan_pengunjung|im_start|im_end|inst|sys|context|prompt)\b[^>]*>|\[\/?(system|sistem|inst|sys|admin|developer|assistant)\]|<\|[\w-]+\|>|\{\{\s*(system|prompt|instructions?)/i,
  ],
  [
    "override",
    /\b(abaikan|lupakan|acuhkan|hiraukan|kesampingkan|timpa|langgar|nonaktifkan|ignore|disregard|forget|override|bypass|disable)\b[^.?!\n]{0,40}\b(instruksi|aturan|perintah|prompt|batasan|pedoman|panduan|kebijakan|filter|instructions?|rules|guidelines|restrictions?|guardrails?|polic(y|ies)|directives?|constraints?)/i,
  ],
  [
    "system-prompt",
    /\b(system\s*-?\s*(prompt|instructions?)|(prompt|instruksi)\s+sistem|developer\s+(message|prompt|instructions?)|initial\s+(prompt|instructions?)|hidden\s+(prompt|instructions?)|instruksi\s+(awal|internal|tersembunyi|rahasia)|prompt\s+(awal|asli|rahasia|tersembunyi)|mode\s+(dewa|god|jailbreak|tanpa\s+(batas|filter))|(aktifkan|enable|activate)\s+(mode|developer\s+mode|debug\s+mode))\b/i,
  ],
  [
    "own-config",
    /\b(instruksi|aturan|perintah|prompt|pedoman|panduan|batasan|kebijakan|konfigurasi|pengaturan)(mu|\s+(yang\s+)?((harus|wajib)\s+)?(kamu|anda|lo|lu|elo|elu))\b|\byour\s+(own\s+)?(system\s+)?(instructions?|rules|prompts?|guidelines|directives|configuration|config|programming|polic(y|ies)|constraints)\b|\b(instructions?|rules|prompt)\s+(you\s+(were\s+given|follow|received|have)|above)\b/i,
  ],
  [
    "persona",
    /\b(kamu|anda|lo|lu|dirimu)\s+(sekarang|kini)\s+(adalah|jadi|menjadi|berperan|bertindak)\b|\b(berpura-?pura(lah)?|pura-?pura(lah)?|berperanlah|bertindaklah|anggap(lah)?\s+(dirimu|kamu|anda))\b|\b(you\s+are\s+now|pretend\s+(to\s+be|you\s+are)|role-?play\s+as|jailbreak|do\s+anything\s+now)\b|\b(mulai|dari)\s+(sekarang|saat\s+ini|detik\s+ini)\b[^.?!\n]{0,40}\b(kamu|anda|jawab|balas|tulis|gunakan|respon|bicara|berperan|bertindak)|\bfrom\s+now\s+on\b[^.?!\n]{0,40}\b(you|your|answer|reply|respond|act|only|always|never)\b/i,
  ],
  [
    "format",
    /\b(jawab(lah)?|menjawab|jawabanmu|balas(lah)?|membalas|balasanmu|tuliskan|keluarkan|tampilkan|cetak(lah)?|output(kan)?|answer|reply|dump|encode|enkode|kodekan)\b[^.?!\n]{0,50}\b(json|yaml|xml|toml|csv|base\s*-?\s*64|rot\s*-?\s*13|hex(adecimal)?|heksadesimal|biner|binary|morse|leet\s*speak|code\s*blocks?|blok\s+kode)\b/i,
  ],
  [
    "extract",
    /\b(ulangi|tulis\s+ulang|salin|cetak|tampilkan|tunjukkan|bocorkan|beberkan|ungkapkan|sebutkan|repeat|reveal|recite|print|show|display|output|dump|leak|copy|translate|terjemahkan|ringkas|rangkum|summari[sz]e|list)\b[^.?!\n]{0,40}\b(teks|text|kalimat|pesan|message|semua|everything|all|words?|kata|isi)\s+(di\s+atas|sebelumnya|pertama|awal|above|before|earlier|so\s+far|tersembunyi|hidden)\b/i,
  ],
  [
    "tools",
    /show_(section|contact)|\b(tools?|fungsi|functions?)\b[^.?!\n]{0,30}\b(kamu|anda|you)\b[^.?!\n]{0,20}\b(punya|miliki|panggil|gunakan|pakai|akses|have|call|use|access)\b/i,
  ],
];

const obfuscated =
  /systemprompt|promptsistem|instruksisistem|systeminstruction|ignore(all)?(previous|prior|above)instructions/;

/** Name of the first prompt-injection pattern in a visitor message, else null. */
export function injectionRule(text: string) {
  const clean = cleanVisitorText(text);
  if (obfuscated.test(clean.toLowerCase().replace(/[^\p{L}]/gu, "")))
    return "obfuscated";
  return firstMatch(injectionRules, clean);
}

/** Injection check for the newest visitor message; older ones were checked when they were sent. */
export function questionRule(
  messages: readonly { role: string; content?: unknown }[],
) {
  const content = messages.findLast(
    (message) => message.role === "user",
  )?.content;
  return typeof content === "string" ? injectionRule(content) : null;
}

const outputRules: Rule[] = [
  ["encoded", /[a-z0-9+/]{40,}/i],
  [
    "internals",
    /pesan_pengunjung|system\s*prompt|(prompt|instruksi)\s+sistem|security rules|facts about rahmat/i,
  ],
  [
    "self-disclosure",
    /\b(instruksi|aturan|pedoman|panduan|konfigurasi|perintah)\s+(saya|internal|rahasia|tersembunyi)\b|\bsaya\s+(diinstruksikan|diprogram|dikonfigurasi|diperintahkan|dilarang)\b|\bmy\s+(system\s+)?(instructions|rules|guidelines|prompt)\b/i,
  ],
];

const structuredStart = /^\s*(```|~~~|\{|\[\s*[{"]|<[a-z])/i;

const words = (text: string) =>
  text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];

function shingles(text: string, size = 5) {
  const list = words(text);
  const result = new Set<string>();
  for (let index = 0; index + size <= list.length; index++)
    result.add(list.slice(index, index + size).join(" "));
  return result;
}

const ruleShingles = shingles(chatRules.replace(chatRefusal, ""));

function scan(text: string, echoes: Set<string>) {
  for (const shingle of shingles(text))
    if (ruleShingles.has(shingle)) echoes.add(shingle);
  return (
    firstMatch(outputRules, text) ?? (echoes.size >= 2 ? "rule-echo" : null)
  );
}

/** Name of the first leak or format rule an assistant reply breaks, else null. */
export const outputViolation = (text: string) =>
  structuredStart.test(text) ? "structured" : scan(text, new Set());

const toolInputs = new Map<string, z.ZodType>(
  chatTools.map((tool) => [tool.name, tool.inputSchema]),
);

const parseJson = (text: unknown): unknown => {
  if (typeof text !== "string") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const shownResult = (content: unknown) => {
  const result = parseJson(content);
  return {
    shown:
      typeof result === "object" &&
      result !== null &&
      "shown" in result &&
      result.shown === true,
  };
};

/**
 * History as the client sent it, minus what the client can forge to steer the model: reasoning, names,
 * tool calls outside the tool schemas (and their results) and anything in a tool result besides `shown`.
 */
export function guardHistory(messages: readonly ModelMessage[]) {
  const calls = new Set<string>();
  return messages.flatMap((message): ModelMessage[] => {
    if (message.role === "tool") {
      if (!message.toolCallId || !calls.has(message.toolCallId)) return [];
      return [
        {
          ...message,
          content: JSON.stringify(shownResult(message.content)),
          error: undefined,
        },
      ];
    }
    const cleaned = {
      ...message,
      name: undefined,
      thinking: undefined,
      blockOrder: undefined,
    };
    if (message.role !== "assistant") return [cleaned];
    const toolCalls = message.toolCalls?.flatMap((call) => {
      const input = toolInputs
        .get(call.function.name)
        ?.safeParse(parseJson(call.function.arguments));
      if (!input?.success) return [];
      calls.add(call.id);
      return [
        {
          ...call,
          function: {
            name: call.function.name,
            arguments: JSON.stringify(input.data),
          },
        },
      ];
    });
    if (!toolCalls?.length && !message.content) return [];
    return [
      { ...cleaned, toolCalls: toolCalls?.length ? toolCalls : undefined },
    ];
  });
}

const visitorMessage = (text: string) =>
  `<pesan_pengunjung>\n${text.replace(/</g, "‹").replace(/>/g, "›")}\n</pesan_pengunjung>`;

/** What the model reads: visitor text fenced as data, injection attempts and tampered replies neutralized. */
export function providerView(messages: readonly ModelMessage[]) {
  return messages.map((message): ModelMessage => {
    if (message.role === "user") {
      const text =
        typeof message.content === "string"
          ? cleanVisitorText(message.content)
          : "";
      return {
        ...message,
        content: visitorMessage(
          injectionRule(text) ? "[pesan disembunyikan]" : text,
        ),
      };
    }
    if (
      message.role === "assistant" &&
      typeof message.content === "string" &&
      outputViolation(message.content)
    )
      return { ...message, content: chatRefusal };
    return message;
  });
}

export const chatGuard: ChatMiddleware = {
  name: "chat-guard",
  onConfig(_ctx, config) {
    const messages = guardHistory(config.messages);
    return { messages, providerMessages: providerView(messages) };
  },
};

const holdBack = 160;

export const cutNotice =
  "Maaf, sisa jawaban ini tidak bisa ditampilkan. Untuk detailnya, silakan hubungi Rahmat lewat email.";

const passThrough = new Set<string>([
  EventType.RUN_STARTED,
  EventType.TEXT_MESSAGE_START,
  EventType.TOOL_CALL_START,
  EventType.TOOL_CALL_ARGS,
  EventType.TOOL_CALL_END,
  EventType.TOOL_CALL_RESULT,
]);

const snapshotRoles = new Set(["user", "assistant", "tool"]);

interface Reply {
  raw: string;
  scanned: number;
  sent: number;
  shown: string;
  echoes: Set<string>;
  blocked: boolean;
}

/** The text that broke the rule, for the server log only: the visitor never sees it. */
function replyEvidence(rule: string, { raw, echoes }: Reply) {
  if (rule === "rule-echo") return [...echoes].join(" | ");
  const match = outputRules.find(([name]) => name === rule)?.[1].exec(raw);
  if (!match) return raw.slice(0, 120);
  return raw.slice(
    Math.max(0, match.index - 80),
    match.index + match[0].length + 80,
  );
}

const sentenceEnd = /[.!?…](?=\s)|\n/g;

/** End of the last whole sentence or line between `from` and `limit`, so a cut reply never stops mid-sentence. */
function releasable(text: string, from: number, limit: number) {
  if (limit <= from) return from;
  let end = from;
  for (const match of text.slice(from, limit + 1).matchAll(sentenceEnd))
    end = Math.min(from + match.index + match[0].length, limit);
  return end;
}

/**
 * Only allowlisted events reach the browser: reasoning, steps, raw provider events and provider error text never do.
 * Reply text is released whole sentences at a time, at least 160 characters behind the model, so a leak or a forced
 * format is caught before it is shown and a cut reply ends on a full sentence; a reply blocked before its first
 * sentence becomes the standard refusal. Message snapshots carry only what was shown.
 */
export async function* guardStream(
  stream: AsyncIterable<StreamChunk>,
  history: readonly { id?: string }[],
): AsyncGenerator<StreamChunk> {
  const known = new Set(history.map((message) => message.id));
  const replies = new Map<string, Reply>();

  const release = (messageId: string, reply: Reply, delta: string) => {
    reply.shown += delta;
    return {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta,
      timestamp: Date.now(),
    } satisfies StreamChunk;
  };

  function* flush() {
    for (const [messageId, reply] of replies) {
      if (reply.blocked || reply.raw.length === reply.sent) continue;
      const delta = reply.raw.slice(reply.sent);
      reply.sent = reply.raw.length;
      yield release(messageId, reply, delta);
    }
  }

  for await (const chunk of stream) {
    switch (chunk.type) {
      case EventType.TEXT_MESSAGE_CONTENT: {
        const reply = replies.get(chunk.messageId) ?? {
          raw: "",
          scanned: 0,
          sent: 0,
          shown: "",
          echoes: new Set<string>(),
          blocked: false,
        };
        replies.set(chunk.messageId, reply);
        if (reply.blocked) break;
        reply.raw += chunk.delta;
        const rule = structuredStart.test(reply.raw)
          ? "structured"
          : scan(
              reply.raw.slice(Math.max(0, reply.scanned - holdBack)),
              reply.echoes,
            );
        reply.scanned = reply.raw.length;
        if (rule) {
          reply.blocked = true;
          warn("reply", rule, replyEvidence(rule, reply));
          yield release(
            chunk.messageId,
            reply,
            reply.sent ? `\n\n${cutNotice}` : chatRefusal,
          );
        } else {
          const end = releasable(
            reply.raw,
            reply.sent,
            reply.raw.length - holdBack,
          );
          if (end > reply.sent) {
            const delta = reply.raw.slice(reply.sent, end);
            reply.sent = end;
            yield release(chunk.messageId, reply, delta);
          }
        }
        break;
      }
      case EventType.TEXT_MESSAGE_END:
      case EventType.RUN_FINISHED:
        yield* flush();
        yield chunk;
        break;
      case EventType.MESSAGES_SNAPSHOT:
        yield* flush();
        yield {
          ...chunk,
          messages: chunk.messages.flatMap((message) => {
            if (!snapshotRoles.has(message.role)) return [];
            if (message.role !== "assistant" || known.has(message.id))
              return [message];
            return [
              {
                ...message,
                content: replies.get(message.id)?.shown || undefined,
              },
            ];
          }),
        };
        break;
      case EventType.RUN_ERROR:
        yield {
          ...chunk,
          message: "Asisten gagal menjawab.",
          error: undefined,
        };
        break;
      default:
        if (passThrough.has(chunk.type)) yield chunk;
    }
  }
}

/** A normal assistant turn with the standard refusal, for questions blocked before reaching the model. */
export async function* refusalStream(
  threadId: string,
  runId: string,
): AsyncGenerator<StreamChunk> {
  const messageId = crypto.randomUUID();
  const timestamp = Date.now();
  yield { type: EventType.RUN_STARTED, threadId, runId, timestamp };
  yield {
    type: EventType.TEXT_MESSAGE_START,
    messageId,
    role: "assistant",
    timestamp,
  };
  yield {
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta: chatRefusal,
    timestamp,
  };
  yield { type: EventType.TEXT_MESSAGE_END, messageId, timestamp };
  yield {
    type: EventType.RUN_FINISHED,
    threadId,
    runId,
    timestamp,
    finishReason: "stop",
  };
}
