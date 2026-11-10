import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest config for the web (dining room) app.
 *
 * The web app is a *new surface* with no parity obligation (it is not a
 * kitchen), so it has its own test setup, independent of the PY/TS golden
 * matrix. jsdom gives us a DOM; @vitejs/plugin-react handles the JSX/TSX.
 * The `@/*` alias mirrors the tsconfig `paths` so `@/lib/...` imports resolve.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The board client is a "use client" component that reads params + auth;
    // tests mock those, so no real browser/network is needed.
    restoreMocks: true,
  },
});
