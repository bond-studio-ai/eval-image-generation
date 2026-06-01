import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDesignMaterials } from "@/lib/design-materials";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const VANITY_ID = "123e4567-e89b-12d3-a456-426614174000";
const FLOOR_ID = "223e4567-e89b-12d3-a456-426614174000";

function catalogResponse(product: Record<string, unknown>) {
  return new Response(JSON.stringify({ data: product }), { status: 200, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildDesignMaterials", () => {
  it("returns null when no scan can be resolved", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await buildDesignMaterials({ design: {} });
    expect(result).toBeNull();
  });

  it("builds surfaces/objects from catalog products, gating on UUIDs", async () => {
    const fetchFn = vi.fn((url: string) => {
      if (url.includes("/catalog/products/vanities/")) {
        return Promise.resolve(catalogResponse({ renderAttributes: { "3DAssetId": "vanity-asset" }, numberOfSinks: 1, length: 60 }));
      }
      if (url.includes("/catalog/products/floor_tiles/")) {
        return Promise.resolve(catalogResponse({ renderAttributes: { "3DAssetId": "floor-asset" } }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });
    vi.stubGlobal("fetch", fetchFn);

    const result = await buildDesignMaterials({
      design: { id: "design-1", vanity: VANITY_ID, floorTile: FLOOR_ID, mirror: "not-a-uuid" },
      roomData: { scan: { areas: { showers: [{ id: 1 }] }, tubs: [{ type: "Alcove" }] } }
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("design-1");
    expect(result?.objects.vanity).toMatchObject({ asset: "vanity-asset", numberOfSinks: 1 });
    expect(result?.surfaces.floorTile).toMatchObject({ texture: "floor-asset" });
    // non-UUID slot is never fetched
    expect(result?.objects.mirror).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalledWith(expect.stringContaining("not-a-uuid"));
  });

  it("injects styling-only showerGlass and tubDoor objects from scan context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 404 })))
    );
    const result = await buildDesignMaterials({
      design: { isShowerGlassVisible: false },
      roomData: { scan: { areas: { showers: [{ id: 1 }] }, tubs: [{ type: "Alcove" }] } }
    });
    expect(result?.objects.showerGlass).toEqual({ styling: "Hidden" });
    expect(result?.objects.tubDoor).toEqual({ styling: "Default" });
  });

  it("falls back to projectId then 'unknown' for the id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("{}", { status: 404 })))
    );
    const result = await buildDesignMaterials({
      design: {},
      roomData: { scan: { areas: {} } },
      projectId: "proj-9"
    });
    expect(result?.id).toBe("proj-9");
  });
});
