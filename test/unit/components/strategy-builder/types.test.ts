import { describe, expect, it } from "vitest";
import { categoryLabel, defaultJudgeStep, defaultStep, FALLBACK_GENERATION_MODEL, FALLBACK_JUDGE_MODEL, nextUid, normalizeProductImageType, normalizeProductImageTypes } from "@/components/strategy-builder/types";

describe("categoryLabel", () => {
  it("title-cases snake_case categories", () => {
    expect(categoryLabel("shower_wall_tiles")).toBe("Shower Wall Tiles");
    expect(categoryLabel("faucets")).toBe("Faucets");
  });
});

describe("normalizeProductImageType", () => {
  it("passes through valid image types", () => {
    expect(normalizeProductImageType("line-drawing")).toBe("line-drawing");
    expect(normalizeProductImageType("tear-sheet")).toBe("tear-sheet");
  });

  it("falls back to the default for invalid values", () => {
    expect(normalizeProductImageType("bogus")).toBe("featured-image");
    expect(normalizeProductImageType(null)).toBe("featured-image");
  });
});

describe("normalizeProductImageTypes", () => {
  it("normalizes each entry and defaults invalid ones", () => {
    expect(normalizeProductImageTypes({ faucets: "tear-sheet", mirrors: "bogus" })).toEqual({ faucets: "tear-sheet", mirrors: "featured-image" });
  });

  it("returns an empty map for nullish input", () => {
    expect(normalizeProductImageTypes(null)).toEqual({});
    expect(normalizeProductImageTypes(undefined)).toEqual({});
  });
});

describe("nextUid", () => {
  it("produces monotonically distinct ids", () => {
    const a = nextUid();
    const b = nextUid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^sb-\d+$/);
  });
});

describe("defaultStep", () => {
  it("creates a generation step with a uid and the given prompt version", () => {
    const step = defaultStep("pv1");
    expect(step).toMatchObject({ type: "generation", prompt_version_id: "pv1", model: FALLBACK_GENERATION_MODEL });
    expect(step._uid).toMatch(/^sb-\d+$/);
  });

  it("honors a custom model", () => {
    expect(defaultStep("pv1", "custom-model").model).toBe("custom-model");
  });
});

describe("defaultJudgeStep", () => {
  it("creates a judge step with one nested judge", () => {
    const step = defaultJudgeStep();
    expect(step.type).toBe("judge");
    expect(step.judges).toHaveLength(1);
    expect(step.judges?.[0]?.judge_model).toBe(FALLBACK_JUDGE_MODEL);
  });
});
