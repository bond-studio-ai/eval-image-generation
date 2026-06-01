import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAnalyticsRatings,
  fetchAnalyticsStrategyPerformance,
  fetchGenerationById,
  fetchGenerations,
  fetchInputPresetById,
  fetchInputPresets,
  fetchInputPresetsMinimal,
  fetchPromptPreviewDollhouseSource,
  fetchPromptVersionById,
  fetchPromptVersions,
  fetchPromptVersionsMinimal,
  fetchStrategies,
  fetchStrategyById,
  fetchStrategyModelCatalog,
  fetchStrategyRunById,
  fetchStrategyRuns
} from "@/lib/service-client";

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

describe("prompt version fetchers", () => {
  it("requests the prompt-versions list with the given limit", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([{ id: "pv1" }])));
    await expect(fetchPromptVersions(25)).resolves.toEqual([{ id: "pv1" }]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://svc.test/image-generation/v1/prompt-versions?limit=25");
  });

  it("requests the minimal prompt-versions list", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([])));
    await fetchPromptVersionsMinimal();
    expect(fetchFn.mock.calls[0]?.[0]).toContain("minimal=true");
  });

  it("requests the dollhouse preview source", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse({ projectId: "p", projectLabel: "L", defaultAreaSummary: null, areas: [] })));
    await fetchPromptPreviewDollhouseSource();
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/prompt-versions/preview/dollhouse-source");
  });

  it("validates a prompt version detail through the schema", async () => {
    stubFetch(() => Promise.resolve(dataResponse({ id: "pv1", systemPrompt: "sys", userPrompt: "usr" })));
    await expect(fetchPromptVersionById("pv1")).resolves.toMatchObject({ id: "pv1", systemPrompt: "sys" });
  });

  it("throws when the prompt version detail is malformed", async () => {
    stubFetch(() => Promise.resolve(dataResponse({ noId: true })));
    await expect(fetchPromptVersionById("pv1")).rejects.toThrow(/Malformed/);
  });
});

describe("strategy run fetchers", () => {
  it("requests the strategy runs list with a custom limit", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([{ id: "r1" }])));
    await fetchStrategyRuns("s1", 10);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://svc.test/image-generation/v1/strategies/s1/runs?limit=10");
  });

  it("requests a single strategy run by id", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse({ id: "run-1" })));
    await expect(fetchStrategyRunById("run-1")).resolves.toMatchObject({ id: "run-1" });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/strategy-runs/run-1");
  });

  it("throws on a non-2xx service response", async () => {
    stubFetch(() => Promise.resolve(new Response("err", { status: 500 })));
    await expect(fetchStrategyRunById("run-1")).rejects.toThrow(/Service 500/);
  });
});

describe("input preset fetchers", () => {
  it("requests the input-presets list, minimal list, and a single preset", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse([{ id: "ip1" }])));
    await fetchInputPresets(5);
    await fetchInputPresetsMinimal();
    stubFetch(() => Promise.resolve(dataResponse({ id: "ip1" })));
    await expect(fetchInputPresetById("ip1")).resolves.toMatchObject({ id: "ip1" });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/input-presets?limit=5");
    expect(fetchFn.mock.calls[1]?.[0]).toContain("minimal=true");
  });
});

describe("generation fetchers", () => {
  it("validates a generation detail through the schema", async () => {
    stubFetch(() => Promise.resolve(dataResponse({ id: "g1", results: [{ id: "res1", url: "u" }] })));
    await expect(fetchGenerationById("g1")).resolves.toMatchObject({ id: "g1" });
  });

  it("returns the raw paginated envelope for fetchGenerations", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(new Response(JSON.stringify({ data: [{ id: "g1" }], pagination: { total: 1 } }), { status: 200, headers: { "content-type": "application/json" } })));
    const result = await fetchGenerations({ page: "1", limit: "20" });
    expect(result.data).toEqual([{ id: "g1" }]);
    expect(result.pagination).toEqual({ total: 1 });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/generations?page=1&limit=20");
  });

  it("throws when fetchGenerations gets a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(new Response("nope", { status: 503 })));
    await expect(fetchGenerations({})).rejects.toThrow(/Service 503/);
  });
});

describe("fetchAnalyticsStrategyPerformance", () => {
  it("serializes params and unwraps the data envelope", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(dataResponse({ rows: [], models: ["m1"] })));
    const result = await fetchAnalyticsStrategyPerformance({ from: "2026-01-01" });
    expect(result.models).toEqual(["m1"]);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/analytics/strategy-performance?from=2026-01-01");
  });
});

describe("fetchStrategyModelCatalog", () => {
  it("fetches generation/preview/judge models from the v2 base", async () => {
    const fetchFn = stubFetch((url) => Promise.resolve(dataResponse([{ id: `model-for-${new URL(url).searchParams.get("useCase") ?? ""}` }])));
    const catalog = await fetchStrategyModelCatalog();
    expect(catalog.generation[0]?.id).toBe("model-for-IMAGE_GENERATION");
    expect(catalog.preview[0]?.id).toBe("model-for-PREVIEW_IMAGE_GENERATION");
    expect(catalog.judge[0]?.id).toBe("model-for-JUDGING");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("https://svc.test/image-generation/v2/providers/models");
    expect(fetchFn.mock.calls[0]?.[0]).toContain("perPage=200");
  });
});
