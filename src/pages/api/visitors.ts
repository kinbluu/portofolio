import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getVisitorCount, recordVisitor } from "../../lib/visitor-count";
import { isVisitorId } from "../../lib/visitor-id";

export const prerender = false;

const headers = { "Cache-Control": "no-store" };

export const GET: APIRoute = async ({ clientAddress }) => {
  try {
    const { success } = await env.VISITOR_RATE_LIMITER.limit({
      key: clientAddress,
    });
    if (!success) return new Response(null, { status: 429, headers });
    const count = await getVisitorCount(env.VISITOR_DB);
    return Response.json({ count }, { headers });
  } catch (error) {
    console.error("[visitors] Unable to read visitor count", error);
    return new Response(null, { status: 503, headers });
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403, headers });

  const visitorId = request.headers.get("X-Visitor-Id");
  if (!isVisitorId(visitorId))
    return new Response(null, { status: 400, headers });

  try {
    const { success } = await env.VISITOR_RATE_LIMITER.limit({
      key: clientAddress,
    });
    if (!success) return new Response(null, { status: 429, headers });
    const count = await recordVisitor(env.VISITOR_DB, visitorId);
    return Response.json({ count }, { headers });
  } catch (error) {
    console.error("[visitors] Unable to record visitor", error);
    return new Response(null, { status: 503, headers });
  }
};
