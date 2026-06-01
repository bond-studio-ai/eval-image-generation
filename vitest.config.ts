import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["test/unit/**/*.test.{ts,tsx}", "test/functional/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/**/__tests__/**",
        "src/**/__mocks__/**"
      ]
    }
  },
  resolve: {
    alias: {
      "@": new URL("src", import.meta.url).pathname
    }
  }
});
