import type { ProviderModelV2, StrategyModelCatalog } from '@/lib/service-client';
import { useCallback, useMemo } from 'react';
import {
  FALLBACK_GENERATION_MODEL,
  FALLBACK_JUDGE_MODEL,
  FALLBACK_PREVIEW_MODEL,
  type ModelOption,
} from './types';

function capabilityDefault(models: ProviderModelV2[], fallbackProviderModelId: string): string {
  const defaultModel = models.find((model) => model.useCases.some((useCase) => useCase.isDefault));
  return (
    defaultModel?.id ??
    models.find((model) => model.providerModelId === fallbackProviderModelId)?.id ??
    fallbackProviderModelId
  );
}

function catalogOptions(models: ProviderModelV2[]): ModelOption[] {
  return models.map((model) => ({
    value: model.id,
    label: model.displayName,
    meta: `${model.providerDisplayName} · ${model.providerModelId}`,
  }));
}

function ensureSelectedOption(
  options: ModelOption[],
  value: string,
  catalogById: Map<string, ProviderModelV2>,
): ModelOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  const model = catalogById.get(value);
  return [
    ...options,
    {
      value,
      label: model?.displayName ?? value,
      meta: model ? `${model.providerDisplayName} · ${model.providerModelId}` : value,
    },
  ];
}

export interface ModelCatalogHelpers {
  providerModelIdForSelection: (value: string) => string;
  catalogSelectionForProviderModelId: (value: string, fallback: string) => string;
  defaultGenerationModel: string;
  defaultPreviewModel: string;
  defaultJudgeModel: string;
  generationModels: ModelOption[];
  previewModels: ModelOption[];
  judgeModels: ModelOption[];
}

export function useModelCatalog(
  modelCatalog: StrategyModelCatalog,
  initialStrategyModel: string | undefined,
  initialPreviewModel: string | null | undefined,
): ModelCatalogHelpers {
  const allCatalogModels = useMemo(
    () => [...modelCatalog.generation, ...modelCatalog.preview, ...modelCatalog.judge],
    [modelCatalog],
  );
  const catalogById = useMemo(
    () => new Map(allCatalogModels.map((model) => [model.id, model])),
    [allCatalogModels],
  );
  const catalogIdByProviderModelId = useMemo(
    () => new Map(allCatalogModels.map((model) => [model.providerModelId, model.id])),
    [allCatalogModels],
  );
  const providerModelIdForSelection = useCallback(
    (value: string) => catalogById.get(value)?.providerModelId ?? value,
    [catalogById],
  );
  const catalogSelectionForProviderModelId = useCallback(
    (value: string, fallback: string) => catalogIdByProviderModelId.get(value) ?? value ?? fallback,
    [catalogIdByProviderModelId],
  );
  const defaultGenerationModel = useMemo(
    () => capabilityDefault(modelCatalog.generation, FALLBACK_GENERATION_MODEL),
    [modelCatalog],
  );
  const defaultPreviewModel = useMemo(
    () => capabilityDefault(modelCatalog.preview, FALLBACK_PREVIEW_MODEL),
    [modelCatalog],
  );
  const defaultJudgeModel = useMemo(
    () => capabilityDefault(modelCatalog.judge, FALLBACK_JUDGE_MODEL),
    [modelCatalog],
  );
  const generationModels = useMemo(
    () =>
      ensureSelectedOption(
        catalogOptions(modelCatalog.generation),
        initialStrategyModel
          ? catalogSelectionForProviderModelId(initialStrategyModel, defaultGenerationModel)
          : defaultGenerationModel,
        catalogById,
      ),
    [
      catalogById,
      catalogSelectionForProviderModelId,
      defaultGenerationModel,
      initialStrategyModel,
      modelCatalog,
    ],
  );

  const previewModels = useMemo(
    () =>
      ensureSelectedOption(
        catalogOptions(modelCatalog.preview),
        initialPreviewModel
          ? catalogSelectionForProviderModelId(initialPreviewModel, defaultPreviewModel)
          : defaultPreviewModel,
        catalogById,
      ),
    [
      catalogById,
      catalogSelectionForProviderModelId,
      defaultPreviewModel,
      initialPreviewModel,
      modelCatalog,
    ],
  );

  const judgeModels = useMemo(
    () => ensureSelectedOption(catalogOptions(modelCatalog.judge), defaultJudgeModel, catalogById),
    [catalogById, defaultJudgeModel, modelCatalog],
  );

  return {
    providerModelIdForSelection,
    catalogSelectionForProviderModelId,
    defaultGenerationModel,
    defaultPreviewModel,
    defaultJudgeModel,
    generationModels,
    previewModels,
    judgeModels,
  };
}
