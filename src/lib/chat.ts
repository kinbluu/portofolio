import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const chatRejectedCode = "chat_rejected";

export const chatLimits = {
  messageLength: 500,
  // ponytail: estimated from maxOutputTokens 1024 (~4-5 chars/token), not measured; tune from a real long chat.
  replyLength: 8_000,
  toolResultLength: 200,
  historyLength: 60_000,
  turns: 12,
  requestSize: 100_000,
};

const contentLimits: Record<string, number> = {
  user: chatLimits.messageLength,
  assistant: chatLimits.replyLength,
  reasoning: chatLimits.replyLength,
  tool: chatLimits.toolResultLength,
};

/** Per-role checks: assistant may omit content (tool calls), user must send non-empty text. */
export function checkHistory(
  messages: readonly { role: string; content?: unknown }[],
): "invalid" | "message" | "length" | null {
  const userCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  if (
    userCount === 0 ||
    messages.some((message) => !Object.hasOwn(contentLimits, message.role))
  )
    return "invalid";
  if (
    userCount > chatLimits.turns ||
    JSON.stringify(messages).length > chatLimits.historyLength
  )
    return "length";
  for (const { role, content } of messages) {
    const limit = contentLimits[role];
    if (role === "user") {
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.length > limit
      )
        return "message";
    } else if (
      content !== undefined &&
      (typeof content !== "string" || content.length > limit)
    ) {
      return "length";
    }
  }
  return null;
}

export const pageSections = [
  "work",
  "experience",
  "about",
  "github",
  "contact",
] as const;

export type PageSection = (typeof pageSections)[number];

/** Rahmat's own contact links: the only external links the chat renders. */
export interface ChatContacts {
  email: string;
  github: string;
  linkedin: string;
}

/**
 * Normalized href the assistant may render as clickable (page section, Rahmat's email, his LinkedIn profile, his GitHub profile/repos), else null.
 * Paths are compared after WHATWG URL normalization, so `../` and `%2e%2e` cannot escape to another account.
 */
export function allowedChatLink(
  href: string,
  { email, github, linkedin }: ChatContacts,
): string | null {
  if (href.startsWith("#"))
    return (pageSections as readonly string[]).includes(href.slice(1))
      ? href
      : null;
  if (href === `mailto:${email}`) return href;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const within = (profileUrl: string, nested: boolean) => {
    const profile = new URL(profileUrl);
    const path = profile.pathname.replace(/\/$/, "");
    return (
      url.origin === profile.origin &&
      (url.pathname === path ||
        url.pathname === `${path}/` ||
        (nested && url.pathname.startsWith(`${path}/`)))
    );
  };
  return within(github, true) || within(linkedin, false) ? url.href : null;
}

export const pageSectionLabels: Record<PageSection, string> = {
  work: "Work",
  experience: "Experience",
  about: "About",
  github: "GitHub",
  contact: "Contact",
};

export const showSectionTool = toolDefinition({
  name: "show_section",
  description:
    "Show the visitor a link to a relevant portfolio section. The visitor can choose whether to open it.",
  inputSchema: z.object({
    section: z
      .enum(pageSections)
      .meta({ description: "Id of the page section to show" }),
  }),
  outputSchema: z.object({ shown: z.boolean() }),
});

export const showContactTool = toolDefinition({
  name: "show_contact",
  description:
    "Show a contact card with Rahmat's email, LinkedIn and GitHub inside the chat. Use it when the visitor wants to contact, hire or work with Rahmat.",
  inputSchema: z.object({}),
  outputSchema: z.object({ shown: z.boolean() }),
});

export const chatTools = [showSectionTool, showContactTool];
