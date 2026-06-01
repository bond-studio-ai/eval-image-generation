import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/catalog/products/[category]/[productId]/route";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function call(category: string, productId: string) {
  return GET(new Request("https://test/catalog"), { params: Promise.resolve({ category, productId }) });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GET catalog product detail", () => {
  it("unwraps the first product from a data array", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "p1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await call("faucets", "p1");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { id: "p1" } });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/products/faucets/p1?");
  });

  it("maps tile categories to the shared tiles segment", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "t1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    await call("floor_tiles", "t1");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/products/tiles/t1?");
  });

  it("falls back to the lvps segment when a tile lookup returns nothing", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "lvp1" }] }));
    vi.stubGlobal("fetch", fetchFn);
    const res = await call("wall_tiles", "lvp1");
    await expect(res.json()).resolves.toEqual({ data: { id: "lvp1" } });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]?.[0]).toContain("/products/lvps/lvp1?");
  });

  it("returns 500 when the catalog API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 502 })))
    );
    const res = await call("faucets", "p1");
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "INTERNAL_ERROR" } });
  });
});
