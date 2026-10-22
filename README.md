# Astro Starter Kit: Minimal

```sh
bun create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command               | Action                                           |
| :-------------------- | :----------------------------------------------- |
| `bun install`         | Installs dependencies                            |
| `bun dev`             | Starts local dev server at `localhost:4321`      |
| `bun build`           | Build your production site to `./dist/`          |
| `bun preview`         | Preview your build locally, before deploying     |
| `bun astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help` | Get help using the Astro CLI                     |

## Loading states

Intro uses CSS `enter-N` rise-in on load; below-the-fold sections fade in on scroll via `src/scripts/reveal.ts` (Motion, `[data-reveal]`), disabled for `prefers-reduced-motion`. Only the deferred GitHub calendar shows a loading placeholder.

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
- Prompt-injection guard (`src/lib/chat-guard.ts`): known injection patterns get the standard refusal without a model call; the model reads visitor text fenced as `<pesan_pengunjung>` data; forged reasoning, tool calls and tool results are dropped from the history; replies stream 160 characters behind the model and become the refusal on a prompt leak or a forced format (JSON, code, markup, encodings); reasoning and provider error text never reach the browser.
- Guard checks: `bun tests/chat-guard.test.ts`, and against a running server with real model calls (about 3 minutes per round): `bun tests/chat-injection.e2e.ts [url] [rounds]`.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
