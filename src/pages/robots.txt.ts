import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      ...(site ? [`Sitemap: ${new URL("/sitemap.xml", site)}`] : []),
    ].join("\n") + "\n",
  );
