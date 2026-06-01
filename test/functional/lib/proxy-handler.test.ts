import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCatchAllProxy } from "@/lib/proxy-handler";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const mockedAuth = vi.mocked(auth);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function params(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  mockedAuth.mockResolvedValue({ userId: "user_1" } as Awaited<ReturnType<typeof auth>>);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("createCatchAllProxy", () => {
  it("returns 401 when auth has no userId", async () => {
    mockedAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(401);
  });

  it("skips auth when requireAuth is false", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(jsonResponse({ data: [] })));
    vi.stubGlobal("fetch", fetchFn);
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc", requireAuth: false });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(200);
    expect(mockedAuth).not.toHaveBeenCalled();
  });

  it("proxies to the upstream URL and forwards the JSON body", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "a" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things?page=2"), params(["things"]));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [{ id: "a" }] });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://upstream.test/things?page=2");
  });

  it("applies rewriteQuery to the upstream request", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [] })));
    vi.stubGlobal("fetch", fetchFn);
    const proxy = createCatchAllProxy({
      getBaseUrl: () => "https://upstream.test",
      serviceName: "svc",
      rewriteQuery: (p) => {
        const next = new URLSearchParams(p);
        next.set("rewritten", "1");
        return next;
      }
    });
    await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things?page=1"), params(["things"]));
    expect(fetchFn.mock.calls[0]?.[0]).toContain("rewritten=1");
  });

  it("applies transformJson to a successful response body", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(jsonResponse({ value: 1 })));
    vi.stubGlobal("fetch", fetchFn);
    const proxy = createCatchAllProxy({
      getBaseUrl: () => "https://upstream.test",
      serviceName: "svc",
      transformJson: () => ({ value: 99 })
    });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    await expect(res.json()).resolves.toEqual({ value: 99 });
  });

  it("returns 500 PROXY_CONFIG_ERROR when getBaseUrl throws", async () => {
    const proxy = createCatchAllProxy({
      getBaseUrl: () => {
        throw new Error("missing env");
      },
      serviceName: "svc"
    });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "PROXY_CONFIG_ERROR" } });
  });

  it("returns 502 UPSTREAM_NETWORK_ERROR when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("ECONNREFUSED")))
    );
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UPSTREAM_NETWORK_ERROR" } });
  });

  it("returns an empty object for an empty JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("", { status: 200, headers: { "content-type": "application/json" } })))
    );
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({});
  });

  it("returns 502 UPSTREAM_BAD_JSON when the JSON body is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("not-json{", { status: 200, headers: { "content-type": "application/json" } })))
    );
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ error: { code: "UPSTREAM_BAD_JSON" } });
  });

  it("passes a non-JSON upstream body through untouched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("plain text", { status: 200, headers: { "content-type": "text/plain" } })))
    );
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/raw"), params(["raw"]));
    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("plain text");
  });

  it("forwards a non-ok JSON body with the upstream status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ error: "missing" }, 404)))
    );
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const res = await proxy.GET(new NextRequest("https://app.test/api/v1/svc/things"), params(["things"]));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "missing" });
  });

  it("forwards the request body and method on a POST", async () => {
    const fetchFn = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse({ ok: true })));
    vi.stubGlobal("fetch", fetchFn);
    const proxy = createCatchAllProxy({ getBaseUrl: () => "https://upstream.test", serviceName: "svc" });
    const req = new NextRequest("https://app.test/api/v1/svc/things", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "content-type": "application/json" }
    });
    await proxy.POST(req, params(["things"]));
    const [, init] = fetchFn.mock.calls[0] ?? [];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });
});
