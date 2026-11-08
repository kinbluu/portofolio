import { defineMiddleware } from "astro:middleware";
import Negotiator from "negotiator";
import { indexablePaths, pageMarkdown } from "./data/site-content";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, site } = context;
  if (
    !["GET", "HEAD"].includes(request.method) ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/_server-islands/")
  )
    return next();
  const base = site ?? new URL("https://kinbluu.biz.id/");
  const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  const alias =
    pathname === "/index.md"
      ? "/"
      : pathname.endsWith(".md")
        ? pathname.slice(0, -3)
        : undefined;
  const page = indexablePaths.includes(pathname);
  const markdown =
    alias && indexablePaths.includes(alias)
      ? pageMarkdown(alias, base)
      : undefined;
  if (markdown)
    return new Response(request.method === "HEAD" ? null : markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  const type = new Negotiator({
    headers: { accept: request.headers.get("Accept") ?? "*/*" },
  }).mediaType(["text/html; charset=utf-8", "text/markdown; charset=utf-8"]);
  if (page && !type)
    return new Response(
      request.method === "HEAD"
        ? null
        : "Available representations: text/html and text/markdown.\n",
      {
        status: 406,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  if (page && type?.startsWith("text/markdown"))
    return new Response(
      request.method === "HEAD" ? null : pageMarkdown(pathname, base),
      {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  const response = await next();
  if (!page && response.status !== 404) return response;
  const headers = new Headers(response.headers);
  if (
    headers.get("Vary") !== "*" &&
    !headers
      .get("Vary")
      ?.split(",")
      .some((value) => value.trim().toLowerCase() === "accept")
  )
    headers.append("Vary", "Accept");
  if (response.status === 404 && type?.startsWith("text/markdown")) {
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.delete("Content-Length");
    return new Response(
      request.method === "HEAD"
        ? null
        : `# 404: Page not found\n\nThe requested page does not exist on Rahmat's portfolio. Check the URL or use the links below to find published information.\n\n- [Agent guidance](${new URL("/llms.txt", base)})\n- [Sitemap](${new URL("/sitemap.xml", base)})\n`,
      { status: 404, headers },
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
