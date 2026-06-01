import { describe, expect, it } from "vitest";
import { normalizeV2PaginationResponse, rewriteV1PaginationToV2 } from "@/lib/v2-pagination";

describe("rewriteV1PaginationToV2", () => {
  it("maps page/limit to currentPage/perPage", () => {
    const result = rewriteV1PaginationToV2(new URLSearchParams("page=2&limit=25"));
    expect(result.get("currentPage")).toBe("2");
    expect(result.get("perPage")).toBe("25");
    expect(result.has("page")).toBe(false);
  });

  it("passes through unrelated params", () => {
    const result = rewriteV1PaginationToV2(new URLSearchParams("page=1&status=ok"));
    expect(result.get("status")).toBe("ok");
    expect(result.get("currentPage")).toBe("1");
  });

  it("returns the original params object untouched when nothing maps", () => {
    const params = new URLSearchParams("status=ok&q=tile");
    expect(rewriteV1PaginationToV2(params)).toBe(params);
  });
});

describe("normalizeV2PaginationResponse", () => {
  it("translates a v2 pagination object to the v1 shape", () => {
    const result = normalizeV2PaginationResponse({
      data: [1, 2],
      pagination: { currentPage: 3, perPage: 10, lastPage: 5, total: 42 }
    }) as { data: unknown; pagination: Record<string, unknown> };
    expect(result.pagination).toMatchObject({ page: 3, limit: 10, totalPages: 5, total: 42 });
    expect(result.data).toEqual([1, 2]);
  });

  it("preserves the original v2 keys alongside the v1 aliases", () => {
    const result = normalizeV2PaginationResponse({
      pagination: { currentPage: 1, perPage: 20 }
    }) as { pagination: Record<string, unknown> };
    expect(result.pagination["currentPage"]).toBe(1);
    expect(result.pagination["page"]).toBe(1);
  });

  it("returns the input untouched when there is no pagination object", () => {
    const input = { data: [] };
    expect(normalizeV2PaginationResponse(input)).toBe(input);
  });

  it("returns the input untouched when pagination has no v2 keys", () => {
    const input = { pagination: { somethingElse: 1 } };
    expect(normalizeV2PaginationResponse(input)).toBe(input);
  });

  it("returns non-objects untouched", () => {
    expect(normalizeV2PaginationResponse(null)).toBe(null);
    expect(normalizeV2PaginationResponse("x")).toBe("x");
  });
});
