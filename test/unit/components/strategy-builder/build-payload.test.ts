import { describe, expect, it } from "vitest";
import { buildStrategyPayload } from "@/components/strategy-builder/build-payload";
import { defaultJudgeStep, defaultPreviewSettings, defaultStep, defaultStrategySettings, type PreviewSettings } from "@/components/strategy-builder/types";

const identity = (value: string) => value;

function build(overrides: Partial<Parameters<typeof buildStrategyPayload>[0]> = {}) {
  return buildStrategyPayload({
    name: "  My Strategy  ",
    description: "  desc  ",
    strategySettings: defaultStrategySettings,
    previewSettings: defaultPreviewSettings,
    steps: [defaultStep("pv1")],
    providerModelIdForSelection: identity,
    ...overrides
  });
}

describe("buildStrategyPayload", () => {
  it("trims name and description, dropping an empty description", () => {
    expect(build().name).toBe("My Strategy");
    expect(build().description).toBe("desc");
    expect(build({ description: "   " }).description).toBeUndefined();
  });

  it("maps strategy settings to the camelCase wire shape", () => {
    const payload = build();
    expect(payload).toMatchObject({
      model: defaultStrategySettings.model,
      aspectRatio: "1:1",
      outputResolution: "1K",
      temperature: 1,
      checkSceneAccuracy: false,
      enableMultiTurnContext: false
    });
  });

  it("nulls preview fields when no preview model is set and populates them otherwise", () => {
    expect(build().previewModel).toBeNull();
    expect(build().previewResolution).toBeNull();
    const withPreview: PreviewSettings = { preview_model: "p-model", preview_resolution: "2K" };
    const payload = build({ previewSettings: withPreview });
    expect(payload.previewModel).toBe("p-model");
    expect(payload.previewResolution).toBe("2K");
  });

  it("assigns sequential stepOrder and resolves provider model ids", () => {
    const payload = buildStrategyPayload({
      name: "S",
      description: "",
      strategySettings: defaultStrategySettings,
      previewSettings: defaultPreviewSettings,
      steps: [defaultStep("pv1"), defaultStep("pv2")],
      providerModelIdForSelection: (v) => `provider/${v}`
    });
    expect(payload.steps.map((s) => s.stepOrder)).toEqual([1, 2]);
    expect(payload.steps[0]?.model).toBe(`provider/${defaultStrategySettings.model}`);
  });

  it("defaults judge image count and nulls the prompt version for judge steps", () => {
    const judge = defaultJudgeStep();
    delete judge.number_of_images;
    const payload = build({ steps: [judge] });
    const [step] = payload.steps;
    expect(step?.type).toBe("judge");
    expect(step?.numberOfImages).toBe(4);
    expect(step?.promptVersionId).toBeNull();
    expect(step?.judges).toHaveLength(1);
  });

  it("omits judges on generation steps", () => {
    expect(build().steps[0]?.judges).toBeUndefined();
  });
});
