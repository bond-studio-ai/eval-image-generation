import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("forwards each level to the matching console method with context args", () => {
    const levels = ["debug", "info", "warn", "error"] as const;
    for (const level of levels) {
      const spy = vi.spyOn(console, level).mockImplementation(() => undefined);
      logger[level]("[scope] message", { a: 1 }, 2);
      expect(spy).toHaveBeenCalledWith("[scope] message", { a: 1 }, 2);
    }
  });
});
