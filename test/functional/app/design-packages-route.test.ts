import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/design-packages/route";

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

describe("GET design packages", () => {
  it("hits the studio design-packages endpoint and forwards the retailerId", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "pkg-1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await GET(new Request("https://app.test/api/v1/design-packages?retailerId=r1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [{ id: "pkg-1" }] });
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(url).toContain("https://api.example.com/studio/v1/design-packages");
    expect(url).toContain("useUUIDs=");
    expect(url).toContain("retailerId=r1");
  });

  it("passes through a non-array data payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: { id: "single" } })))
    );
    const res = await GET(new Request("https://app.test/api/v1/design-packages"));
    await expect(res.json()).resolves.toEqual({ data: { id: "single" } });
  });

  it("returns 500 when the design packages API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 500 })))
    );
    const res = await GET(new Request("https://app.test/api/v1/design-packages"));
    expect(res.status).toBe(500);
  });
});
