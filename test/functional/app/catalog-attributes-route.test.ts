import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/catalog/products/[category]/attributes/route";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function call(category: string) {
  return GET(new Request("https://test/attributes"), { params: Promise.resolve({ category }) });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET catalog product attributes", () => {
  it("rejects an unknown category with a 400", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await call("not-a-category");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("extracts sorted dot-path attributes from the first product", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: [{ id: "p1", renderAttributes: { textureScale: { x: 1 } }, images: ["skip-me"] }] })))
    );
    const res = await call("faucets");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { attributes: string[] } };
    expect(body.data.attributes).toEqual(["id", "renderAttributes", "renderAttributes.textureScale", "renderAttributes.textureScale.x"]);
    // `images` is in the skip set
    expect(body.data.attributes).not.toContain("images");
  });

  it("returns an empty attribute list when no products are returned", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: [] })))
    );
    const res = await call("faucets");
    await expect(res.json()).resolves.toMatchObject({ data: { attributes: [] } });
  });

  it("maps tile categories to the shared 'tiles' catalog segment", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [] })));
    vi.stubGlobal("fetch", fetchFn);
    await call("floor_tiles");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/products/tiles?");
  });

  it("returns a 500 when the catalog API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 502 })))
    );
    const res = await call("faucets");
    expect(res.status).toBe(500);
  });
});
