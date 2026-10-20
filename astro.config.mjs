// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Isi domain production di sini (mis. "https://rahmat.dev"). Selama kosong, canonical, og:url,
// og:image absolut, sitemap, dan link sitemap di robots.txt tidak di-generate.
const site = undefined;

export default defineConfig({
  site,
  adapter: cloudflare({ imageService: "compile" }),
  session: false,
  integrations: [react()],
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Manrope",
      cssVariable: "--font-manrope",
      weights: [400, 600, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.google(),
      name: "DM Sans",
      cssVariable: "--font-dm-sans",
      weights: [400, 500],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
  ],
  env: {
    schema: {
      GITHUB_USERNAME: envField.string({
        context: "server",
        access: "public",
        default: "kinkenkan298",
      }),
      GEMINI_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GROQ_API_KEY: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // @lucide/astro ships raw .ts/.astro; skip pre-bundling so icons aren't discovered mid-request,
    // which re-optimizes deps and loads a second React copy in workerd SSR (invalid hook call).
    optimizeDeps: { exclude: ["@lucide/astro"] },
  },
});
