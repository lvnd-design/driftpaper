import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// Builds the portable, framework-free background renderer to a single ESM
// file in /embed, committed to the repo so it can be served directly off
// GitHub (e.g. via jsDelivr) with no npm publish step.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "embed",
    lib: {
      entry: fileURLToPath(new URL("./src/embed/stipple-background.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "stipple-background.js",
    },
  },
});
