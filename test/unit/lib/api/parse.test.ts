import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseOrFallback, parseOrThrow } from "@/lib/api/parse";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const schema = z.object({ id: z.string(), count: z.number() });

describe("parseOrThrow", () => {
  it("returns parsed data on success", () => {
    expect(parseOrThrow(schema, { id: "a", count: 1 }, "test")).toEqual({ id: "a", count: 1 });
  });

  it("throws a contextual error on failure", () => {
    expect(() => parseOrThrow(schema, { id: "a" }, "widgets")).toThrow(/Malformed response for widgets/);
  });
});

describe("parseOrFallback", () => {
  it("returns parsed data on success", () => {
    expect(parseOrFallback(schema, { id: "a", count: 2 }, { id: "", count: 0 }, "test")).toEqual({ id: "a", count: 2 });
  });

  it("returns the fallback on failure", () => {
    const fallback = { id: "fallback", count: -1 };
    expect(parseOrFallback(schema, { bad: true }, fallback, "test")).toBe(fallback);
  });
});
