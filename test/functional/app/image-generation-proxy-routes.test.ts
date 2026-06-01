import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as v1Route from "@/app/api/v1/image-generation/[[...path]]/route";
import * as v2Route from "@/app/api/v1/image-generation-v2/[[...path]]/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const mockedAuth = vi.mocked(auth);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  mockedAuth.mockResolvedValue({ userId: "user_1" } as Awaited<ReturnType<typeof auth>>);
  vi.stubEnv("BASE_API_HOSTNAME", "https://api.example.com");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("image-generation catch-all proxy route", () => {
  it("exports all HTTP method handlers", () => {
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
      expect(typeof v1Route[method]).toBe("function");
    }
  });

  it("proxies a GET to the v1 image-generation base", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "s1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await v1Route.GET(new NextRequest("https://app.test/api/v1/image-generation/strategies?limit=5"), {
      params: Promise.resolve({ path: ["strategies"] })
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [{ id: "s1" }] });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://api.example.com/image-generation/v1/strategies?limit=5");
  });
});

describe("image-generation-v2 catch-all proxy route", () => {
  it("exports all HTTP method handlers", () => {
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"] as const) {
      expect(typeof v2Route[method]).toBe("function");
    }
  });

  it("proxies a GET to the v2 base and rewrites pagination", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [], pagination: { total: 0 } })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await v2Route.GET(new NextRequest("https://app.test/api/v1/image-generation-v2/generations?page=2&limit=10"), {
      params: Promise.resolve({ path: ["generations"] })
    });
    expect(res.status).toBe(200);
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(url).toContain("https://api.example.com/image-generation/v2/generations");
  });
});
