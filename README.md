# Kamar Rahmat

Rahmat’s portfolio as a cinematic 3D studio. Existing work, experience, skills, GitHub activity, and contacts remain server-rendered and accessible without graphics.

- [Product truth and boundaries](PRODUCT.md)
- [Visual world, story, and implementation decisions](DESIGN.md)

## Development

- Install: `bun install`
- Background dev server: `bun run dev --background`
- Manage server: `bun run astro dev status`, `bun run astro dev logs`, `bun run astro dev stop`
- Verify: `bun check`, `bun lint`, `bun fmt --check`
- Production build: `bun run build`

## Studio verification

Use Obscura rather than launching a separate headless browser:

```sh
obscura serve --port 9222 --allow-private-network
bun tests/studio.e2e.ts
```

Set `STUDIO_TEST_URL` or `OBSCURA_CDP_URL` for another server. Screenshots and machine-readable results are written to `artifacts/`. A browser without a usable GPU validates the illustrated fallback and records GPU-specific checks as unverified, never as passed.

The room uses Three.js WebGPURenderer with WebGL2 fallback, lazy loaded after the initial page. Geometry and typography are procedural, using existing profile content; there are no downloaded room models or invented awards. Drawing is on demand, pauses in hidden tabs, and honors reduced motion. Day/night changes the room, lighting, UI, and fallback illustration together.

## Loading states

The studio initially shows its coordinated illustration. A usable GPU replaces it with the 3D room; rendering failure leaves all HTML and the illustration available. The deferred GitHub calendar retains its existing loading and failure handling.

`src/components/ui/Skeleton.astro` adapts the [shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton) pattern to Astro and the existing theme tokens, without adding client-side JavaScript. `GitHubCalendarSkeleton.astro` composes it into the calendar's responsive layout, uses one shared pulse, and disables motion for `prefers-reduced-motion`. Astro replaces it as soon as the server island responds; there is no artificial delay.

If the island request fails or stalls, the fallback stops loading after 12 seconds (above the upstream's 10-second timeout) and shows an unavailable message with a GitHub link. A late successful response still replaces it. Without JavaScript, the message and link appear immediately instead of an endless skeleton.

Regression check (requires Chromium on `PATH` and a running dev server): `bun tests/github-island-failure.test.ts`. It blocks the real island request with HTTP 503 and a dropped connection, then uses Chromium's virtual clock to verify loading ends and the recovery link is visible. Set `PORTFOLIO_URL` to check another local server.

## 💬 Chat assistant

The chat widget streams answers from Gemini through TanStack AI (`src/pages/api/chat.ts`) and runs on Cloudflare Workers.

- Local key: copy `.dev.vars.example` to `.dev.vars` and fill in `GEMINI_API_KEY`, then restart `bun dev`.
- Production key: `bunx wrangler secret put GEMINI_API_KEY`.
- Deploy: `bun run build && bunx wrangler deploy`.
- The assistant only answers from `src/data/profile.ts` (prompt in `src/lib/chat-prompt.ts`).
- Limits: 10 requests per minute per IP (`ratelimits` in `wrangler.jsonc`), 500 characters per message and 12 questions per conversation (`src/lib/chat.ts`).
- Prompt-injection guard (`src/lib/chat-guard.ts`): known injection patterns get the standard refusal without a model call; the model reads visitor text fenced as `<pesan_pengunjung>` data; forged reasoning, tool calls and tool results are dropped from the history; replies stream whole sentences at least 160 characters behind the model and become the refusal on a prompt leak or a forced format (JSON, code, markup, encodings), or end after the last full sentence with a cut notice when the leak comes later; the server log names the rule and the text that tripped it; reasoning and provider error text never reach the browser.
- Guard checks: `bun tests/chat-guard.test.ts`, and against a running server with real model calls (about 3 minutes per round): `bun tests/chat-injection.e2e.ts [url] [rounds]`.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
