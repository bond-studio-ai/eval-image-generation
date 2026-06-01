import { describe, expect, it } from "vitest";
import { cameraFrameKey, normalizeCameraFrame, validateUnitySlimDesign } from "@/lib/dollhouse-renders";

describe("validateUnitySlimDesign", () => {
  it("rejects non-objects", () => {
    expect(validateUnitySlimDesign(null)).toEqual({ ok: false, error: "Expected a JSON object." });
    expect(validateUnitySlimDesign([])).toEqual({ ok: false, error: "Expected a JSON object." });
  });

  it("requires a non-empty id", () => {
    expect(validateUnitySlimDesign({ objects: {}, surfaces: {} })).toEqual({ ok: false, error: "designMaterials.id is required." });
    expect(validateUnitySlimDesign({ id: "", objects: {}, surfaces: {} })).toEqual({ ok: false, error: "designMaterials.id is required." });
  });

  it("requires objects and surfaces to be records", () => {
    expect(validateUnitySlimDesign({ id: "d1", objects: [], surfaces: {} })).toEqual({ ok: false, error: "designMaterials.objects must be an object." });
    expect(validateUnitySlimDesign({ id: "d1", objects: {}, surfaces: "no" })).toEqual({ ok: false, error: "designMaterials.surfaces must be an object." });
  });

  it("returns the normalized value on success", () => {
    const result = validateUnitySlimDesign({ id: "d1", objects: { vanity: {} }, surfaces: { floorTile: {} }, extra: "ignored" });
    expect(result).toEqual({ ok: true, value: { id: "d1", objects: { vanity: {} }, surfaces: { floorTile: {} } } });
  });
});

describe("normalizeCameraFrame", () => {
  it("returns null when position or rotation is missing", () => {
    expect(normalizeCameraFrame({ aspect: 1, fov: 60, priority: 1, summary: "", products: [] })).toBeNull();
    expect(
      normalizeCameraFrame({
        aspect: 1,
        fov: 60,
        priority: 1,
        summary: "",
        products: [],
        position: { x: 0, y: 0, z: 0 }
      })
    ).toBeNull();
  });

  it("coerces numeric defaults and trims products to fully-populated entries", () => {
    const out = normalizeCameraFrame({
      aspect: 1.333,
      fov: 60,
      priority: 2,
      summary: "Shower Area",
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      products: [
        { id: "p1", category: "Vanity", view: "Front" },
        // missing view → dropped
        { id: "p2", category: "Tub" },
        // bare-id string form is unsupported by upstream → dropped
        "p3"
      ]
    });
    expect(out).toEqual({
      aspect: 1.333,
      fov: 60,
      priority: 2,
      summary: "Shower Area",
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 90, z: 0 },
      products: [{ id: "p1", category: "Vanity", view: "Front" }]
    });
  });

  it("returns null for non-record input", () => {
    expect(normalizeCameraFrame(null)).toBeNull();
    expect(normalizeCameraFrame("frame")).toBeNull();
    expect(normalizeCameraFrame([])).toBeNull();
  });

  it("coerces partial position/rotation coords to 0 and non-array products to []", () => {
    const out = normalizeCameraFrame({
      position: { x: 5 },
      rotation: {},
      products: "not-an-array"
    });
    expect(out).toMatchObject({
      position: { x: 5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: []
    });
  });

  it("defaults non-numeric aspect/fov/priority to 0 rather than dropping the frame", () => {
    const out = normalizeCameraFrame({
      aspect: "not a number",
      fov: undefined,
      priority: null,
      summary: 42, // wrong type → empty string
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: []
    });
    expect(out).toEqual({
      aspect: 0,
      fov: 0,
      priority: 0,
      summary: "",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: []
    });
  });
});

describe("cameraFrameKey", () => {
  it("always includes the array index so duplicate (priority, summary) pairs stay distinct", () => {
    const a = {
      aspect: 1,
      fov: 60,
      priority: 1,
      summary: "Vanity",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: []
    };
    expect(cameraFrameKey(a, 0)).not.toBe(cameraFrameKey(a, 1));
  });

  it("handles empty summaries without colliding on priority alone", () => {
    const a = {
      aspect: 1,
      fov: 60,
      priority: 5,
      summary: "",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      products: []
    };
    expect(cameraFrameKey(a, 0)).toBe("0|p5|");
    expect(cameraFrameKey(a, 1)).toBe("1|p5|");
  });
});
