import { describe, expect, it } from "vitest";
import {
  buildCreateRenderBody,
  buildImageConfig,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_SSM_PARAMS,
  FORMAT_OPTIONS,
  parseDesignMaterialsOverride,
  parseRoomDataOverride
} from "@/app/dollhouse-renders/new/_components/build-request";
import type { UnitySlimDesignMaterials } from "@/lib/dollhouse-renders";

describe("dollhouse render image config defaults", () => {
  it("matches the proven 4:3 dollhouse-capture defaults", () => {
    expect(DEFAULT_IMAGE_CONFIG).toEqual({
      format: "Png",
      width: "1920",
      height: "1440",
      superSamplingMultiplier: ""
    });
    expect(buildImageConfig(DEFAULT_IMAGE_CONFIG)).toEqual({
      format: "Png",
      width: 1920,
      height: 1440
    });
  });

  it("falls back to the service defaults when dimensions are invalid", () => {
    expect(
      buildImageConfig({
        ...DEFAULT_IMAGE_CONFIG,
        width: "0",
        height: "not-a-number"
      })
    ).toEqual({
      format: "Png",
      width: 1920,
      height: 1440
    });
  });

  it("puts PNG first in the format picker", () => {
    expect(FORMAT_OPTIONS[0]).toEqual({ value: "Png", label: "PNG" });
  });
});

describe("parseDesignMaterialsOverride", () => {
  it("treats empty input as not-provided so the project value wins", () => {
    expect(parseDesignMaterialsOverride("")).toEqual({
      provided: false,
      value: null,
      error: null
    });
    expect(parseDesignMaterialsOverride("   \n  ")).toEqual({
      provided: false,
      value: null,
      error: null
    });
  });

  it("reports invalid JSON with the parser error", () => {
    const result = parseDesignMaterialsOverride("{not json");
    expect(result.provided).toBe(true);
    expect(result.value).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects non-object JSON", () => {
    expect(parseDesignMaterialsOverride("[]").error).toMatch(/object/i);
    expect(parseDesignMaterialsOverride('"hi"').error).toMatch(/object/i);
  });

  it("requires id/objects/surfaces shape", () => {
    expect(parseDesignMaterialsOverride("{}").error).toMatch(/id/);
    expect(parseDesignMaterialsOverride('{"id":"d1"}').error).toMatch(/objects/);
    expect(parseDesignMaterialsOverride('{"id":"d1","objects":{}}').error).toMatch(/surfaces/);
  });

  it("returns the typed payload when valid", () => {
    const json = JSON.stringify({ id: "d1", objects: { foo: 1 }, surfaces: { bar: 2 } });
    const result = parseDesignMaterialsOverride(json);
    expect(result).toEqual({
      provided: true,
      value: { id: "d1", objects: { foo: 1 }, surfaces: { bar: 2 } },
      error: null
    });
  });
});

describe("parseRoomDataOverride", () => {
  it("treats empty input as not-provided", () => {
    expect(parseRoomDataOverride("")).toEqual({
      provided: false,
      value: null,
      error: null
    });
  });

  it("accepts any JSON object", () => {
    const result = parseRoomDataOverride('{"walls":[],"floor":{}}');
    expect(result.provided).toBe(true);
    expect(result.value).toEqual({ walls: [], floor: {} });
    expect(result.error).toBeNull();
  });

  it("rejects arrays and primitives", () => {
    expect(parseRoomDataOverride("[]").error).toMatch(/object/i);
    expect(parseRoomDataOverride("42").error).toMatch(/object/i);
  });
});

describe("buildCreateRenderBody", () => {
  const designMaterials: UnitySlimDesignMaterials = { id: "d1", objects: {}, surfaces: {} };
  const base = {
    projectId: "PRJ-1",
    designMaterials,
    roomData: { walls: [] },
    cameraFrames: [],
    imageConfig: DEFAULT_IMAGE_CONFIG,
    renderConfig: DEFAULT_RENDER_CONFIG,
    ssmParams: DEFAULT_SSM_PARAMS,
    styleOverrides: []
  };

  it("emits only the required fields when optional sub-objects are empty", () => {
    const body = buildCreateRenderBody(base);
    expect(body).toMatchObject({ projectId: "PRJ-1", designMaterials, roomData: { walls: [] } });
    expect(body.renderConfig).toBeUndefined();
    expect(body.ssmParams).toBeUndefined();
    expect(body.styleOverrides).toBeUndefined();
  });

  it("includes render config, ssm params, and cleaned style overrides when provided", () => {
    const body = buildCreateRenderBody({
      ...base,
      renderConfig: { renderMode: "LINEWORK", advancedSegmentation: true, overrideCameraHeight: "1.5" },
      ssmParams: { addressablesCatalog: " cat ", host: "", uploadBucket: "bucket" },
      styleOverrides: [
        { id: "o1", product: "vanity", style: "Modern" },
        { id: "o2", product: "  ", style: "skip" }
      ]
    });
    expect(body.renderConfig).toEqual({ renderMode: "LINEWORK", advancedSegmentation: true, overrideCameraHeight: 1.5 });
    expect(body.ssmParams).toEqual({ addressablesCatalog: "cat", uploadBucket: "bucket" });
    expect(body.styleOverrides).toEqual([{ product: "vanity", style: "Modern" }]);
  });

  it("drops a non-finite override camera height", () => {
    const body = buildCreateRenderBody({
      ...base,
      renderConfig: { renderMode: "default", advancedSegmentation: false, overrideCameraHeight: "not-a-number" }
    });
    expect(body.renderConfig).toBeUndefined();
  });

  it("honors a super-sampling multiplier in the image config", () => {
    const body = buildCreateRenderBody({ ...base, imageConfig: { ...DEFAULT_IMAGE_CONFIG, superSamplingMultiplier: "2" } });
    expect(body.imageConfig).toMatchObject({ superSamplingMultiplier: 2 });
  });
});
