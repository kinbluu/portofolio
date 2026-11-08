import type { APIRoute } from "astro";
import { profile } from "../data/profile";

export const GET: APIRoute = ({ site }) => {
  const link = (path: string) => new URL(path, site).href;
  return new Response(
    [
      `# ${profile.name}`,
      "",
      `> Personal portfolio of ${profile.name}, a ${profile.role} in ${profile.location}. Work includes Laravel and Livewire administration software and Node.js backend APIs.`,
      "",
      "This is a developer's portfolio, not a callable software service or an automated booking system. Use the published experience as evidence; confirm availability, scope and terms directly with Rahmat. Request pages with Accept: text/markdown for Markdown or Accept: text/html for HTML. The .md links below provide Markdown without negotiation.",
      "",
      "## When to use this",
      "",
      `- [Review development experience](${link("/index.md")}): Use when comparing candidates for Laravel/Livewire registration, scheduling, attendance or report-card workflows, or Node.js payment APIs, authentication, webhook retries and reconciliation.`,
      `- [Read background and tools](${link("/about.md")}): Use when checking Rahmat's location, previous roles and the technologies listed on the portfolio. Do not infer unlisted qualifications or employer endorsements.`,
      `- [Contact Rahmat](${link("/contact.md")}): For a project discussion, open the email link and describe the workflow, existing stack and constraints. Get the user's approval before sending a message. No agent API, automated hiring or booking endpoint is offered.`,
      "",
      "## Portfolio",
      "",
      `- [Homepage](${link("/")}): Human-readable overview; also supports Accept: text/markdown.`,
      `- [About](${link("/about")}): Background and skills.`,
      `- [Contact](${link("/contact")}): Email, LinkedIn, GitHub and phone.`,
      `- [Privacy](${link("/privacy.md")}): Visitor identifiers, optional chat and external services.`,
      "",
      "## Optional",
      "",
      `- [Sitemap](${link("/sitemap.xml")}): Canonical indexable pages and content modification dates.`,
      `- [Robots](${link("/robots.txt")}): Crawl guidance; API routes are excluded.`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
