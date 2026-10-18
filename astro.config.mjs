// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
      GITHUB_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      GITHUB_USERNAME: envField.string({ context: "server", access: "public", default: "kinkenkan298" }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
