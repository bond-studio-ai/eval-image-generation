import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPresetRunRequests } from "@/lib/strategy-run-input";

vi.mock("@/lib/design-materials", () => ({
  buildDesignMaterials: vi.fn(() => Promise.resolve({ id: "dm-1", objects: {}, surfaces: {} }))
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("fetchPresetRunRequests", () => {
  it("throws when a preset fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ error: { message: "nope" } }, 500)))
    );
    await expect(fetchPresetRunRequests(["preset-1"], {})).rejects.toThrow(/nope/);
  });

  it("maps presets to run requests without a dollhouse capture when a dollhouse view exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ data: { dollhouseView: "https://example.com/d.png" } })))
    );
    const requests = await fetchPresetRunRequests(["preset-1"], { batch: true });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ preset_id: "preset-1", batch: true });
    expect(requests[0]?.dollhouse_capture).toBeUndefined();
  });

  it("builds a dollhouse capture via the bootstrap + design chain", async () => {
    const fetchFn = vi.fn((url: string) => {
      if (url.includes("/input-presets/")) {
        return Promise.resolve(jsonResponse({ data: { layoutTypeId: "layout-1", pkgId: "pkg-1" } }));
      }
      if (url.includes("/layout-presets/bootstrap")) {
        return Promise.resolve(jsonResponse({ data: { project_id: "proj-1", room_data: { scan: {} } } }));
      }
      if (url.includes("/design")) {
        return Promise.resolve(jsonResponse({ data: { room_data: { scan: {} } } }));
      }
      return Promise.resolve(jsonResponse({}, 404));
    });
    vi.stubGlobal("fetch", fetchFn);

    const requests = await fetchPresetRunRequests(["preset-1"], {});
    expect(requests[0]?.dollhouse_capture).toMatchObject({
      project_id: "proj-1",
      design_materials: { id: "dm-1" }
    });
  });
});
