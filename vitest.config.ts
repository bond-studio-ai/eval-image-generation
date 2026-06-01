import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/unit/**/*.test.{ts,tsx}", "test/functional/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts", "src/**/__tests__/**", "src/**/__mocks__/**"],
      // Ratchet: floored to the current achieved coverage so it can't backslide.
      // Raise these as coverage grows.
      thresholds: {
        statements: 11,
        branches: 8,
        functions: 8,
        lines: 11
      }
    }
  },
  resolve: {
    alias: {
      "@": new URL("src", import.meta.url).pathname
    }
  }
});
