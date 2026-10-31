declare module "*.astro" {
  const Component: (props: Record<string, unknown>) => unknown;
  export default Component;
}

declare namespace Cloudflare {
  interface Env {
    VISITOR_DB: D1Database;
    VISITOR_RATE_LIMITER: RateLimit;
  }
}
