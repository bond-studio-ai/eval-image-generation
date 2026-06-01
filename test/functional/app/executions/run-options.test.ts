import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BENCHMARK_PROJECT_IDS, executeRuns, fetchRunOptions } from "@/app/executions/_components/run-options";

vi.mock("@/lib/strategy-run-input", () => ({
  fetchPresetRunRequests: vi.fn(() => Promise.resolve([{ preset_id: "p1", batch: true }]))
}));

const { fetchPresetRunRequests } = await import("@/lib/strategy-run-input");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DEFAULT_BENCHMARK_PROJECT_IDS", () => {
  it("is a mutable copy of the canonical benchmark project list", () => {
    expect(DEFAULT_BENCHMARK_PROJECT_IDS.length).toBeGreaterThan(0);
    expect(DEFAULT_BENCHMARK_PROJECT_IDS).toContain("PRJ-P4YAGU7XW");
  });
});

describe("fetchRunOptions", () => {
  it("loads strategies and paginates input presets", async () => {
    const fetchFn = vi.fn((url: string) => {
      if (url.includes("strategies")) return Promise.resolve(jsonResponse({ data: [{ id: "s1", name: "Strat" }] }));
      const page = url.includes("page=2") ? 2 : 1;
      return Promise.resolve(jsonResponse({ data: [{ id: `p${page}`, name: `Preset ${page}` }], pagination: { page, totalPages: 2 } }));
    });
    vi.stubGlobal("fetch", fetchFn);

    const result = await fetchRunOptions();
    expect(result.strategies).toEqual([{ id: "s1", name: "Strat" }]);
    expect(result.presets).toEqual([
      { id: "p1", name: "Preset 1" },
      { id: "p2", name: "Preset 2" }
    ]);
  });

  it("throws when the strategies request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("boom", { status: 500 })))
    );
    await expect(fetchRunOptions()).rejects.toThrow(/Failed to load strategies/);
  });
});

describe("executeRuns", () => {
  it("posts one benchmark run per strategy x project in benchmark mode", async () => {
    const fetchFn = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(jsonResponse({ data: { id: "run" } })));
    vi.stubGlobal("fetch", fetchFn);

    const results = await executeRuns({
      benchmarkMode: true,
      selectedStrategyIds: ["s1", "s2"],
      selectedPresetIds: [],
      selectedBenchmarkProjectIds: ["b1"],
      numberOfImages: 2,
      groupId: "g1"
    });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const [, init] = fetchFn.mock.calls[0] ?? [];
    const body = JSON.parse((init?.body as string) ?? "{}") as Record<string, unknown>;
    expect(body).toMatchObject({ project_id: "b1", group_id: "g1", number_of_images: 2 });
  });

  it("builds preset run requests and posts them per strategy in preset mode", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(jsonResponse({ data: { id: "run" } })));
    vi.stubGlobal("fetch", fetchFn);

    const results = await executeRuns({
      benchmarkMode: false,
      selectedStrategyIds: ["s1"],
      selectedPresetIds: ["p1"],
      selectedBenchmarkProjectIds: [],
      numberOfImages: null,
      groupId: "g1"
    });
    expect(fetchPresetRunRequests).toHaveBeenCalledWith(["p1"], { batch: true, group_id: "g1" });
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("fulfilled");
  });

  it("surfaces an error message when a run POST fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ error: { message: "nope" } }, 400)))
    );
    const results = await executeRuns({
      benchmarkMode: true,
      selectedStrategyIds: ["s1"],
      selectedPresetIds: [],
      selectedBenchmarkProjectIds: ["b1"],
      numberOfImages: null,
      groupId: "g1"
    });
    expect(results[0]?.status).toBe("rejected");
  });
});
