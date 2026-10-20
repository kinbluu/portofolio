import type { APIRoute } from "astro";

// ponytail: single-page site, so one hardcoded URL. Switch to @astrojs/sitemap once more pages exist.
export const GET: APIRoute = ({ site }) =>
  site
    ? new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${new URL("/", site)}</loc></url></urlset>\n`,
        { headers: { "Content-Type": "application/xml" } },
      )
    : new Response(null, { status: 404 });
