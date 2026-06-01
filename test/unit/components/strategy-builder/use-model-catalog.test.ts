// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProviderModelV2, StrategyModelCatalog } from "@/lib/service-client";
import { useModelCatalog } from "@/components/strategy-builder/use-model-catalog";

function model(overrides: Partial<ProviderModelV2> & Pick<ProviderModelV2, "id" | "providerModelId" | "displayName">): ProviderModelV2 {
  return {
    providerId: "prov",
    providerKey: "gemini",
    providerDisplayName: "Gemini",
    shortName: null,
    description: null,
    status: "active",
    metadata: {},
    useCases: [],
    createdAt: "",
    updatedAt: "",
    deletedAt: null,
    ...overrides
  };
}

const catalog: StrategyModelCatalog = {
  generation: [
    model({ id: "gen-1", providerModelId: "pm-gen-1", displayName: "Gen One" }),
    model({ id: "gen-2", providerModelId: "pm-gen-2", displayName: "Gen Two", useCases: [{ id: "u", useCase: "IMAGE_GENERATION", productAvailable: true, isDefault: true, config: {}, sortOrder: 0 }] })
  ],
  preview: [model({ id: "prev-1", providerModelId: "pm-prev-1", displayName: "Preview One" })],
  judge: [model({ id: "judge-1", providerModelId: "pm-judge-1", displayName: "Judge One" })]
};

describe("useModelCatalog", () => {
  it("picks the capability default for generation", () => {
    const { result } = renderHook(() => useModelCatalog(catalog, undefined, undefined));
    expect(result.current.defaultGenerationModel).toBe("gen-2");
  });

  it("maps provider model ids to catalog selections and back", () => {
    const { result } = renderHook(() => useModelCatalog(catalog, undefined, undefined));
    expect(result.current.providerModelIdForSelection("gen-1")).toBe("pm-gen-1");
    expect(result.current.catalogSelectionForProviderModelId("pm-gen-1", "fallback")).toBe("gen-1");
  });

  it("exposes catalog options for each capability", () => {
    const { result } = renderHook(() => useModelCatalog(catalog, undefined, undefined));
    expect(result.current.generationModels).toEqual(expect.arrayContaining([{ value: "gen-1", label: "Gen One", meta: "Gemini · pm-gen-1" }]));
    expect(result.current.previewModels.some((opt) => opt.value === "prev-1")).toBe(true);
    expect(result.current.judgeModels.some((opt) => opt.value === "judge-1")).toBe(true);
  });

  it("appends the initial selection when it is not in the catalog", () => {
    const { result } = renderHook(() => useModelCatalog(catalog, "pm-unknown", undefined));
    expect(result.current.generationModels.some((opt) => opt.value === "pm-unknown")).toBe(true);
  });
});
