import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

export const chatRejectedCode = "chat_rejected";

export const chatLimits = {
  messageLength: 500,
  turns: 12,
  requestSize: 100_000,
};

export const pageSections = ["work", "experience", "about", "github", "contact"] as const;

export type PageSection = (typeof pageSections)[number];

export const pageSectionLabels: Record<PageSection, string> = {
  work: "Pekerjaan",
  experience: "Pengalaman",
  about: "Tentang",
  github: "GitHub",
  contact: "Kontak",
};

export const showSectionTool = toolDefinition({
  name: "show_section",
  description:
    "Scroll the portfolio page to one of its sections and give the visitor a link to it. Use it when the answer is covered by that section.",
  inputSchema: z.object({
    section: z.enum(pageSections).meta({ description: "Id of the page section to show" }),
  }),
  outputSchema: z.object({ shown: z.boolean() }),
});

export const showContactTool = toolDefinition({
  name: "show_contact",
  description:
    "Show a contact card with Rahmat's email and GitHub inside the chat. Use it when the visitor wants to contact, hire or work with Rahmat.",
  inputSchema: z.object({}),
  outputSchema: z.object({ shown: z.boolean() }),
});

export const chatTools = [showSectionTool, showContactTool];
