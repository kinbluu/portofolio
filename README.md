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

Jalankan dev server terlebih dahulu, lalu gunakan Obscura untuk pengujian browser:

```sh
obscura serve --port 9222 --allow-private-network
bun tests/portfolio-redesign.e2e.ts
```

Portofolio dirancang agar konten utama tetap dapat dibaca tanpa JavaScript atau GPU; asisten AI memerlukan JavaScript untuk interaksi. Obscura memiliki keterbatasan untuk mematikan JavaScript dan menguji aktivasi keyboard bawaan; tes navigasi Lenis di bawah menggunakan Chromium untuk memeriksa skip link dan anchor tanpa JavaScript. Tes lama `tests/studio.e2e.ts` dan `tests/studio-polish.e2e.ts` khusus studio 3D dan bukan acuan untuk desain saat ini.

## Smooth scrolling

Lenis menghaluskan scroll roda tetikus; scroll sentuh dan area chat tetap menggunakan perilaku aslinya. Pengaturan `prefers-reduced-motion` mematikan Lenis, termasuk saat preferensi berubah. Tanpa JavaScript, navigasi dan scroll tetap menggunakan perilaku browser.

- Uji lifecycle: `bun tests/smooth-scroll.test.ts`.
- Uji preferensi di Obscura: `bun tests/lenis-scroll.e2e.ts`.
- Uji navigasi, keyboard, chat, sentuhan, dan fallback tanpa JavaScript: `bun tests/lenis-navigation.e2e.ts`. Tes ini memerlukan Chromium di `/usr/bin/chromium`; gunakan `CHROMIUM_PATH` jika lokasinya berbeda.

## Loading states

Kontribusi GitHub dimuat melalui server island dan memiliki fallback cache. Saat island gagal atau tertunda, loading berhenti setelah 12 detik dan menampilkan keterangan tidak tersedia beserta tautan GitHub; respons sukses yang datang terlambat tetap menggantikan fallback.

`src/components/ui/Skeleton.astro` mengadaptasi pola [shadcn/ui Skeleton](https://ui.shadcn.com/docs/components/skeleton) tanpa JavaScript tambahan. Skeleton menghormati `prefers-reduced-motion` dan langsung diganti saat island merespons. Tanpa JavaScript, pesan gagal dan tautan GitHub tersedia sebagai cadangan.

Tes portofolio di atas memeriksa kegagalan HTTP 503 dan koneksi terputus melalui Obscura, serta menguji chat dengan respons lokal yang disimulasikan tanpa memanggil penyedia AI.

## 💬 Chat assistant

Asisten AI mengalirkan jawaban melalui TanStack AI (`src/pages/api/chat.ts`) di Cloudflare Workers. Groq digunakan bila `GROQ_API_KEY` tersedia; jika tidak, digunakan Gemini dengan `GEMINI_API_KEY`.

- Kunci lokal: salin `.dev.vars.example` ke `.dev.vars`, isi `GROQ_API_KEY` dan/atau `GEMINI_API_KEY`, lalu mulai ulang `bun dev`.
- Kunci produksi: `bunx wrangler secret put GROQ_API_KEY` dan/atau `bunx wrangler secret put GEMINI_API_KEY`.
- Deploy: `bun run build && bunx wrangler deploy`.
- The assistant only answers from `src/data/profile.ts` (prompt in `src/lib/chat-prompt.ts`).
- Limits: 10 requests per minute per IP (`ratelimits` in `wrangler.jsonc`), 500 characters per message and 12 questions per conversation (`src/lib/chat.ts`).
- Prompt-injection guard (`src/lib/chat-guard.ts`): known injection patterns get the standard refusal without a model call; the model reads visitor text fenced as `<pesan_pengunjung>` data; forged reasoning, tool calls and tool results are dropped from the history; replies stream whole sentences at least 160 characters behind the model and become the refusal on a prompt leak or a forced format (JSON, code, markup, encodings), or end after the last full sentence with a cut notice when the leak comes later; the server log names the rule and the text that tripped it; reasoning and provider error text never reach the browser.
- Guard checks: `bun tests/chat-guard.test.ts`, and against a running server with real model calls (about 3 minutes per round): `bun tests/chat-injection.e2e.ts [url] [rounds]`.
