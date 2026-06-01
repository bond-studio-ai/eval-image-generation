import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAnalyticsRatings, fetchStrategies, fetchStrategyById } from "@/lib/service-client";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function dataResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.stubEnv("BASE_API_HOSTNAME", "https://svc.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchStrategies", () => {
  it("requests the v1 strategies endpoint and unwraps the data envelope", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([{ id: "s1" }])));
    const result = await fetchStrategies();
    expect(result).toEqual([{ id: "s1" }]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://svc.test/image-generation/v1/strategies?limit=100");
  });

  it("passes a custom limit through", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([])));
    await fetchStrategies(10);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("limit=10");
  });
});

describe("fetchStrategyById", () => {
  it("returns the strategy on success", async () => {
    stubFetch(() => Promise.resolve(dataResponse({ id: "s1", name: "S" })));
    await expect(fetchStrategyById("s1")).resolves.toMatchObject({ id: "s1" });
  });

  it("swallows errors and returns null on a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(dataResponse(null, 404)));
    await expect(fetchStrategyById("missing")).resolves.toBeNull();
  });
});

describe("fetchAnalyticsRatings", () => {
  it("serializes params into the query string", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse({ totalGenerations: 0, ratedGenerations: 0, distribution: [] })));
    await fetchAnalyticsRatings({ from: "2026-01-01", to: "2026-02-01" });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://svc.test/image-generation/v1/analytics/ratings?from=2026-01-01&to=2026-02-01");
  });
});
