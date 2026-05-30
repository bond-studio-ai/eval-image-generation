import { normalizeProductImageTypes, type PreviewSettings, type StepData, type StrategySettings } from "./types";

/**
 * Builds the API request payload (camelCase) from the builder's local state.
 * Pure transformation — keeps the parent's save handler thin without changing
 * the wire format.
 */
export function buildStrategyPayload({
  name,
  description,
  strategySettings,
  previewSettings,
  steps,
  providerModelIdForSelection
}: {
  name: string;
  description: string;
  strategySettings: StrategySettings;
  previewSettings: PreviewSettings;
  steps: StepData[];
  providerModelIdForSelection: (value: string) => string;
}) {
  return {
    name: name.trim(),
    description: description.trim() || undefined,
    model: providerModelIdForSelection(strategySettings.model),
    aspectRatio: strategySettings.aspect_ratio,
    outputResolution: strategySettings.output_resolution,
    temperature: strategySettings.temperature,
    useGoogleSearch: strategySettings.use_google_search,
    tagImages: strategySettings.tag_images,
    groupProductImages: strategySettings.group_product_images,
    checkSceneAccuracy: strategySettings.check_scene_accuracy,
    enableMultiTurnContext: strategySettings.enable_multi_turn_context,
    previewModel: previewSettings.preview_model ? providerModelIdForSelection(previewSettings.preview_model) : null,
    previewResolution: previewSettings.preview_model ? previewSettings.preview_resolution : null,
    steps: steps.map((s, i) => ({
      id: s.id ?? undefined,
      type: s.type ?? "generation",
      numberOfImages: s.type === "judge" ? (s.number_of_images ?? 4) : undefined,
      name: s.name.trim() || null,
      stepOrder: i + 1,
      promptVersionId: s.type === "judge" ? null : s.prompt_version_id,
      model: providerModelIdForSelection(strategySettings.model),
      aspectRatio: strategySettings.aspect_ratio,
      outputResolution: strategySettings.output_resolution,
      temperature: strategySettings.temperature,
      useGoogleSearch: strategySettings.use_google_search,
      tagImages: strategySettings.tag_images,
      groupProductImages: strategySettings.group_product_images,
      dollhouseViewFromStep: s.dollhouse_view_from_step ?? null,
      realPhotoFromStep: s.real_photo_from_step ?? null,
      moodBoardFromStep: s.mood_board_from_step ?? null,
      includeDollhouse: s.include_dollhouse,
      includeRealPhoto: s.include_real_photo,
      includeMoodBoard: s.include_mood_board,
      includeProductImages: s.include_product_images,
      includeProductCategories: s.include_product_categories ?? [],
      productImageTypes: normalizeProductImageTypes(s.product_image_types),
      arbitraryImageFromStep: s.arbitrary_image_from_step ?? null,
      judges:
        s.type === "judge" && s.judges?.length
          ? s.judges.map((j, ji) => ({
              id: j.id,
              name: j.name || null,
              judgeModel: providerModelIdForSelection(j.judge_model),
              judgeType: j.judge_type,
              judgePromptVersionId: j.judge_prompt_version_id,
              toleranceThreshold: j.tolerance_threshold,
              position: ji + 1
            }))
          : undefined
    }))
  };
}
