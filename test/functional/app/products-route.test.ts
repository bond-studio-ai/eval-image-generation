import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getProductDetail } from "@/app/api/v1/products/[productId]/route";
import { GET as getProducts } from "@/app/api/v1/products/route";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("BASE_API_HOSTNAME", "api.example.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET products list", () => {
  it("forwards the retailerId and unwraps the data envelope", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "prod-1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await getProducts(new Request("https://app.test/api/v1/products?retailerId=r1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [{ id: "prod-1" }] });
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(url).toContain("https://api.example.com/catalog/v3/products");
    expect(url).toContain("retailerId=r1");
    expect(url).toContain("perPage=100000");
  });

  it("accepts a bare array response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse([{ id: "a" }])))
    );
    const res = await getProducts(new Request("https://app.test/api/v1/products"));
    await expect(res.json()).resolves.toEqual({ data: [{ id: "a" }] });
  });

  it("returns 500 when the catalog API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("nope", { status: 503 })))
    );
    const res = await getProducts(new Request("https://app.test/api/v1/products"));
    expect(res.status).toBe(500);
  });
});

describe("GET product detail", () => {
  it("unwraps the first product from the data array", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "p1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await getProductDetail(new Request("https://test"), { params: Promise.resolve({ productId: "p1" }) });
    await expect(res.json()).resolves.toEqual({ data: { id: "p1" } });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/products/p1");
  });

  it("returns 500 when the catalog API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 404 })))
    );
    const res = await getProductDetail(new Request("https://test"), { params: Promise.resolve({ productId: "missing" }) });
    expect(res.status).toBe(500);
  });
});
