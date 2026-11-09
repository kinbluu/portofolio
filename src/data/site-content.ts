import { about, experience, featuredRole, profile, skills } from "./profile";

export const contentLastModified = "2026-11-08";
export const siteDescription = `${profile.role} in ${profile.location}. ${profile.headlineLines.join(" ")}`;
export const trustPages = [
  {
    slug: "about",
    title: "About Rahmat",
    description: `Background, experience and tools used by ${profile.name}.`,
    sections: [
      {
        title: "Web applications and APIs",
        paragraphs: [
          `I am ${profile.name}, a ${profile.role} based in ${profile.location}. ${about.description}`,
          `My current work at LEAP English & Digital Class brings registration, class schedules, attendance and report card approvals into one internal platform. The application uses ${featuredRole.stack.join(", ")} and supports staff and student administration.`,
        ],
      },
      {
        title: "Previous work and tools",
        paragraphs: [
          ...experience.map(
            (job) =>
              `${job.title} at ${job.organization} (${job.dates}). ${job.description}`,
          ),
          ...skills.map(({ label, value }) => `${label}: ${value}.`),
        ],
      },
    ],
    links: [
      { label: "View my work", href: "/#work" },
      { label: "Contact Rahmat", href: "/contact" },
    ],
  },
  {
    slug: "contact",
    title: "Contact Rahmat",
    description:
      "Contact details for questions about Rahmat's work, experience and web development.",
    sections: [
      {
        title: "Email and professional profiles",
        paragraphs: [
          `You can contact ${profile.name} at ${profile.email}. I am a ${profile.role} based in ${profile.location}. My LinkedIn profile and GitHub account are linked below so you can check my professional background and public development activity before getting in touch.`,
          "For a conversation about a web application or API, describe the workflow you need, the people who will use it, the existing technology and any known constraints. Relevant examples from my experience include registration, scheduling, attendance, report card approvals, payment APIs and authentication.",
        ],
      },
      {
        title: "Questions about this portfolio",
        paragraphs: [
          "Use email for questions about information published on this site or for privacy requests. Include the page URL and the information you want to discuss. The homepage also has an AI assistant for questions about my work and experience; its answers are in English and may contain mistakes. Contact me directly to confirm details or discuss a project. This site does not provide an automated booking or hiring service.",
        ],
      },
    ],
    links: [
      { label: profile.email, href: `mailto:${profile.email}` },
      { label: "LinkedIn", href: profile.linkedin },
      { label: "GitHub", href: profile.github },
      { label: profile.phone, href: `tel:${profile.phone}` },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    description:
      "How this portfolio uses visitor identifiers, chat messages and browser storage.",
    sections: [
      {
        title: "Visitor count and hosting",
        paragraphs: [
          `This is the personal portfolio of ${profile.name}. The site is hosted on Cloudflare. Requests pass through Cloudflare, which processes connection information such as IP addresses. The application uses the client IP address for request rate limits on the visitor and chat endpoints. Worker observability is enabled, and application errors or blocked chat output may be logged.`,
          "When JavaScript runs, the visitor counter stores a random identifier under portfolio-visitor-id in your browser's local storage and sends it to the visitor endpoint. A Cloudflare D1 database stores distinct identifiers and an aggregate visitor count. The visitor table does not store names, email addresses or IP addresses. Clearing local storage removes the identifier from your browser, not the database, and a later visit can be counted again. The application does not configure an automatic deletion schedule for these database identifiers.",
        ],
      },
      {
        title: "Optional AI chat",
        paragraphs: [
          "Chat is optional. When you submit a message, the conversation history is sent to this site's chat endpoint and to the configured AI provider: Groq when a Groq key is configured, otherwise Google Gemini. Do not send passwords, sensitive personal information or confidential project material. Provider processing and retention are governed by that provider's terms and account settings; this page does not promise a provider retention period.",
          "The chat client saves conversation history in browser session storage. Use the chat's reset control to clear the conversation, or clear this site's session storage in your browser. The application does not write chat history to its visitor database, but diagnostic logs can include blocked output. You can read the portfolio and use its contact links without using chat or enabling JavaScript.",
        ],
      },
      {
        title: "External links and requests",
        paragraphs: [
          `Email links open your mail application. GitHub and LinkedIn links take you to separate services with their own privacy policies. For questions about this site's data handling or a request relating to your information, email ${profile.email}. Describe your request without sending additional sensitive data. This notice describes the current application; it is not a claim of a particular legal certification.`,
        ],
      },
    ],
    links: [
      { label: "Contact about privacy", href: `mailto:${profile.email}` },
    ],
  },
];

export const indexablePaths = [
  "/",
  ...trustPages.map(({ slug }) => `/${slug}`),
];

export function pageMarkdown(pathname: string, site: URL): string | undefined {
  const link = (path: string) => new URL(path, site).href;
  if (pathname === "/")
    return [
      `# ${profile.name}`,
      "",
      siteDescription,
      "",
      "## Current work",
      "",
      `${featuredRole.employer} (${featuredRole.dates}). ${featuredRole.description}`,
      `Stack: ${featuredRole.stack.join(", ")}.`,
      "",
      ...featuredRole.modules.map(({ name, detail }) => `- ${name}: ${detail}`),
      "",
      "## Experience",
      "",
      ...experience.flatMap((job) => [
        `### ${job.title}`,
        "",
        `${job.organization} (${job.dates}). ${job.description}`,
        `Stack: ${job.stack}.`,
        "",
      ]),
      "## About",
      "",
      about.description,
      "",
      ...skills.map(({ label, value }) => `- ${label}: ${value}`),
      "",
      "## Contact",
      "",
      `- [Email Rahmat](mailto:${profile.email})`,
      `- [LinkedIn](${profile.linkedin})`,
      `- [GitHub](${profile.github})`,
      `- [Phone](tel:${profile.phone})`,
      "",
      "## Site information",
      "",
      ...trustPages.map(
        ({ slug, title }) => `- [${title}](${link(`/${slug}`)})`,
      ),
      `- [Agent guidance](${link("/llms.txt")})`,
      `- [Sitemap](${link("/sitemap.xml")})`,
      "",
    ].join("\n");
  const page = trustPages.find(({ slug }) => pathname === `/${slug}`);
  if (!page) return undefined;
  return [
    `# ${page.title}`,
    "",
    ...page.sections.flatMap(({ title, paragraphs }) => [
      `## ${title}`,
      "",
      ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ]),
    "## Links",
    "",
    ...page.links.map(
      ({ label, href }) =>
        `- [${label}](${href.startsWith("/") ? link(href) : href})`,
    ),
    `- [Portfolio](${link("/")})`,
    "",
  ].join("\n");
}
