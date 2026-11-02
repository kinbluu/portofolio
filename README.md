# Portofolio Rahmat

Portofolio editorial Mochammad Rahmat Muttaqin, full-stack developer di Surabaya. Konten utama berbahasa Indonesia, berfokus pada pengalaman nyata, dengan tipografi terpusat, ruang lega, palet monokrom beraksen biru, dan tema terang/gelap mengikuti preferensi perangkat. Tidak menggunakan 3D atau foto pada bagian perkenalan.

- [Product truth and boundaries](PRODUCT.md)
- [Visual world, story, and implementation decisions](DESIGN.md)

## Development

- Install: `bun install`
- Background dev server: `bun run dev --background`
- Manage server: `bun run astro dev status`, `bun run astro dev logs`, `bun run astro dev stop`
- Verify: `bun check`, `bun lint`, `bun fmt --check`
- Production build: `bun run build`

## Verifikasi portofolio

Jalankan dev server terlebih dahulu. Pengujian browser memerlukan `agent-desktop`, `agent-browser` (terpasang melalui `bun install`, membutuhkan Node.js 24+), Chromium, dan sesi desktop dengan aksesibilitas aktif; di Linux, sesi tersebut juga memerlukan display dan bus AT-SPI.

```sh
agent-desktop status
agent-desktop skills get desktop
agent-desktop skills get platform
agent-browser skills list
agent-browser skills get core
bun run test:e2e
```

Suite ini mencakup tes visitor counter, yang memerlukan migrasi D1 lokal dan menambahkan kunjungan ke database lokal (lihat bagian Visitor counter). Tes `chat-injection.e2e.ts` dijalankan terpisah karena menggunakan model AI sungguhan.

Untuk menjalankan satu tes, gunakan `bun tests/run-desktop.ts portfolio-redesign.e2e.ts`. Runner meminta `agent-desktop` membuka browser baru dengan profil sementara dan endpoint CDP loopback, lalu menutup browser tersebut setelah tes. Runner tidak menutup browser yang sudah berjalan; gunakan sesi desktop terpisah jika `agent-desktop` menolak meluncurkan instance baru. Default browser adalah `/usr/bin/chromium`; atur `CHROMIUM_PATH` jika lokasinya berbeda. Untuk server tanpa display, sediakan sesi desktop virtual dan bus AT-SPI terisolasi sebelum menjalankan tes.

Tes navigasi desktop menggunakan snapshot dan klik aksesibilitas `agent-desktop`; seluruh tes browser lainnya menggunakan CLI `agent-browser`. Proxy lokal menyediakan respons chat dan kegagalan jaringan, sementara profil terisolasi digunakan untuk visitor counter dan pengujian tanpa JavaScript. Tes sentuhan mengirim input tepercaya melalui stream loopback `agent-browser`. Portofolio dirancang agar konten utama tetap dapat dibaca tanpa JavaScript atau GPU; asisten AI memerlukan JavaScript untuk interaksi. Tes lama `tests/studio.e2e.ts` dan `tests/studio-polish.e2e.ts` khusus studio 3D dan bukan acuan untuk desain saat ini.

## Smooth scrolling

Lenis menghaluskan scroll roda tetikus; scroll sentuh dan area chat tetap menggunakan perilaku aslinya. Pengaturan `prefers-reduced-motion` mematikan Lenis, termasuk saat preferensi berubah. Tanpa JavaScript, navigasi dan scroll tetap menggunakan perilaku browser.

- Uji lifecycle: `bun tests/smooth-scroll.test.ts`.
- Uji preferensi dan lifecycle browser: `bun tests/run-desktop.ts lenis-scroll.e2e.ts`.
- Uji navigasi, keyboard, chat, sentuhan, dan fallback tanpa JavaScript: `bun tests/run-desktop.ts lenis-navigation.e2e.ts`.

## Loading states

Kontribusi GitHub dimuat melalui server island dan memiliki fallback cache. Saat island gagal atau tertunda, loading berhenti setelah 12 detik dan menampilkan keterangan tidak tersedia beserta tautan GitHub; respons sukses yang datang terlambat tetap menggantikan fallback.

`src/components/ui/Skeleton.astro` mengadaptasi pola [shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton) tanpa JavaScript tambahan. Skeleton menghormati `prefers-reduced-motion` dan langsung diganti saat island merespons. Tanpa JavaScript, pesan gagal dan tautan GitHub tersedia sebagai cadangan.

Tes portofolio di atas memeriksa kegagalan HTTP 503 dan koneksi terputus, serta menguji chat dengan respons lokal yang disimulasikan tanpa memanggil penyedia AI.

## Visitor counter

The footer counts estimated unique browsers from the time the counter is enabled. A random ID is saved in the browser's local storage and in D1; refreshing does not add another visit. Clearing site data, using private browsing, or using another browser or device can be counted again. Visitors without JavaScript or writable local storage are not counted. The count is hidden if the service is unavailable.

The database stores the random ID indefinitely, not names or email addresses. Cloudflare may process request IP addresses for rate limiting and logs. Review the privacy notice and applicable storage-consent requirements for your audience. Rate limiting reduces abuse, but bots and cleared browser data can still inflate the count.

- Local setup: `bunx wrangler d1 migrations apply VISITOR_DB --local` before starting the dev server. Local data is separate from production.
- Production setup: create a D1 database with `bunx wrangler d1 create portofolio-visitors`, add the returned `database_name` and `database_id` to the existing `VISITOR_DB` binding in `wrangler.jsonc`, then run `bunx wrangler d1 migrations apply VISITOR_DB --remote` before deploying. If a database has already been created for this binding, use its existing name and ID instead of creating another.
- An ID-less binding may cause Wrangler to provision a database automatically during deployment; migrations still need to be applied separately. D1 usage is subject to Cloudflare's quotas and pricing.
- Tests: `bun tests/visitor-count.test.ts` uses an isolated local D1 database; `bun tests/run-desktop.ts visitor-count.e2e.ts` uses the running local server and adds test visits to its database.

## 💬 Chat assistant

Asisten AI mengalirkan jawaban melalui TanStack AI (`src/pages/api/chat.ts`) di Cloudflare Workers. Groq digunakan bila `GROQ_API_KEY` tersedia; jika tidak, digunakan Gemini dengan `GEMINI_API_KEY`.

- Kunci lokal: salin `.dev.vars.example` ke `.dev.vars`, isi `GROQ_API_KEY` dan/atau `GEMINI_API_KEY`, lalu mulai ulang `bun dev`.
- Kunci produksi: `bunx wrangler secret put GROQ_API_KEY` dan/atau `bunx wrangler secret put GEMINI_API_KEY`.
- Deploy: `bun run build && bunx wrangler deploy`.
- The assistant only answers from `src/data/profile.ts` (prompt in `src/lib/chat-prompt.ts`).
- Limits: 10 requests per minute per IP (`ratelimits` in `wrangler.jsonc`), 500 characters per message and 12 questions per conversation (`src/lib/chat.ts`).
- Prompt-injection guard (`src/lib/chat-guard.ts`): known injection patterns get the standard refusal without a model call; the model reads visitor text fenced as `<pesan_pengunjung>` data; forged reasoning, tool calls and tool results are dropped from the history; replies stream whole sentences at least 160 characters behind the model and become the refusal on a prompt leak or a forced format (JSON, code, markup, encodings), or end after the last full sentence with a cut notice when the leak comes later; the server log names the rule and the text that tripped it; reasoning and provider error text never reach the browser.
- Guard checks: `bun tests/chat-guard.test.ts`, and against a running server with real model calls (about 3 minutes per round): `bun tests/chat-injection.e2e.ts [url] [rounds]`.
