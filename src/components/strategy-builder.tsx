'use client';

import { ResourceFormHeader } from '@/components/resource-form-header';
import { buildStrategyPayload } from '@/components/strategy-builder/build-payload';
import { PreviewSettingsSection } from '@/components/strategy-builder/preview-settings-section';
import { SaveActionBar } from '@/components/strategy-builder/save-action-bar';
import { StepsSection } from '@/components/strategy-builder/steps-section';
import { StrategySettingsSection } from '@/components/strategy-builder/strategy-settings-section';
import {
  defaultPreviewSettings,
  defaultStep,
  defaultStrategySettings,
  nextUid,
  normalizeProductImageTypes,
  type PreviewSettings,
  type StepData,
  type StrategyBuilderProps,
  type StrategySettings,
} from '@/components/strategy-builder/types';
import { useModelCatalog } from '@/components/strategy-builder/use-model-catalog';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export function StrategyBuilder({
  strategyId,
  initialName = '',
  initialDescription = '',
  initialStrategySettings,
  initialPreviewSettings,
  initialSteps,
  initialJudges,
  promptVersions,
  inputPresets,
  modelCatalog,
}: StrategyBuilderProps) {
  const {
    providerModelIdForSelection,
    catalogSelectionForProviderModelId,
    defaultGenerationModel,
    defaultPreviewModel,
    defaultJudgeModel,
    generationModels,
    previewModels,
    judgeModels,
  } = useModelCatalog(
    modelCatalog,
    initialStrategySettings?.model,
    initialPreviewSettings?.preview_model,
  );

  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [strategySettings, setStrategySettings] = useState<StrategySettings>(
    initialStrategySettings
      ? {
          ...initialStrategySettings,
          model: catalogSelectionForProviderModelId(
            initialStrategySettings.model,
            defaultGenerationModel,
          ),
        }
      : { ...defaultStrategySettings, model: defaultGenerationModel },
  );
  const [previewSettings, setPreviewSettings] = useState<PreviewSettings>(
    initialPreviewSettings
      ? {
          ...initialPreviewSettings,
          preview_model: initialPreviewSettings.preview_model
            ? catalogSelectionForProviderModelId(
                initialPreviewSettings.preview_model,
                defaultPreviewModel,
              )
            : null,
        }
      : defaultPreviewSettings,
  );
  const [steps, setSteps] = useState<StepData[]>(
    initialSteps?.length
      ? initialSteps.map((step) => ({
          ...step,
          _uid: step._uid ?? nextUid(),
          model: catalogSelectionForProviderModelId(step.model, defaultGenerationModel),
          judges: step.judges?.map((judge) => ({
            ...judge,
            _uid: judge._uid ?? nextUid(),
            judge_model: catalogSelectionForProviderModelId(judge.judge_model, defaultJudgeModel),
          })),
          product_image_types: normalizeProductImageTypes(step.product_image_types),
        }))
      : [defaultStep(promptVersions[0]?.id ?? '', defaultGenerationModel)],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!strategyId;

  const updateStep = useCallback((idx: number, partial: Partial<StepData>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }, []);

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, defaultStep(promptVersions[0]?.id ?? '', defaultGenerationModel)]);
  }, [defaultGenerationModel, promptVersions]);

  const addJudgeStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        _uid: nextUid(),
        type: 'judge' as const,
        name: 'Judge',
        number_of_images: 4,
        prompt_version_id: '',
        model: defaultGenerationModel,
        aspect_ratio: '1:1',
        output_resolution: '1K',
        temperature: 1.0,
        use_google_search: false,
        tag_images: true,
        dollhouse_view_from_step: null,
        real_photo_from_step: null,
        mood_board_from_step: null,
        include_dollhouse: true,
        include_real_photo: true,
        include_mood_board: true,
        include_product_images: true,
        include_product_categories: [],
        product_image_types: {},
        arbitrary_image_from_step: null,
        judges: [
          {
            _uid: nextUid(),
            name: '',
            judge_model: defaultJudgeModel,
            judge_type: 'individual',
            judge_prompt_version_id: '',
            tolerance_threshold: 1,
          },
        ],
      },
    ]);
  }, [defaultGenerationModel, defaultJudgeModel]);

  const removeStep = useCallback((idx: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((s) => ({
        ...s,
        dollhouse_view_from_step:
          s.dollhouse_view_from_step && s.dollhouse_view_from_step > next.length
            ? null
            : s.dollhouse_view_from_step,
        real_photo_from_step:
          s.real_photo_from_step && s.real_photo_from_step > next.length
            ? null
            : s.real_photo_from_step,
        mood_board_from_step:
          s.mood_board_from_step && s.mood_board_from_step > next.length
            ? null
            : s.mood_board_from_step,
        arbitrary_image_from_step:
          s.arbitrary_image_from_step != null && s.arbitrary_image_from_step > next.length
            ? null
            : s.arbitrary_image_from_step,
      }));
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    if (steps.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const payload = buildStrategyPayload({
        name,
        description,
        strategySettings,
        previewSettings,
        steps,
        providerModelIdForSelection,
      });

      const url = isEditing ? serviceUrl(`strategies/${strategyId}`) : serviceUrl('strategies');
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Failed to save strategy');
        return;
      }

      const sid = isEditing ? strategyId : data.data.id;
      router.push(`/strategies/${sid}`);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    strategySettings,
    previewSettings,
    steps,
    isEditing,
    strategyId,
    router,
    providerModelIdForSelection,
  ]);

  return (
    <div className="space-y-6">
      {/* Header with save */}
      <SaveActionBar
        onSave={handleSave}
        disabled={!name.trim() || steps.length === 0 || saving}
        saving={saving}
        isEditing={isEditing}
      />

      <ResourceFormHeader
        name={name}
        onNameChange={setName}
        namePlaceholder="e.g. Modern bathroom 3-step refinement"
        description={description}
        onDescriptionChange={setDescription}
      />

      <StrategySettingsSection
        strategySettings={strategySettings}
        setStrategySettings={setStrategySettings}
        generationModels={generationModels}
      />

      <PreviewSettingsSection
        previewSettings={previewSettings}
        setPreviewSettings={setPreviewSettings}
        previewModels={previewModels}
        defaultPreviewModel={defaultPreviewModel}
      />

      <StepsSection
        steps={steps}
        updateStep={updateStep}
        removeStep={removeStep}
        addStep={addStep}
        addJudgeStep={addJudgeStep}
        promptVersions={promptVersions}
        judgeModels={judgeModels}
        defaultJudgeModel={defaultJudgeModel}
      />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
