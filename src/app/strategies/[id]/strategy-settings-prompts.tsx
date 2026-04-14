'use client';

import { ViewPromptModal } from '@/components/view-prompt-modal';
import { STRATEGY_PROPERTY_COLORS } from '@/lib/strategy-property-colors';
import Link from 'next/link';
import { useCallback, useState } from 'react';

interface StepWithPrompt {
  stepOrder: number;
  type: 'generation' | 'judge';
  numberOfImages?: number | null;
  name: string | null;
  promptVersionId: string | null;
  promptVersionName: string | null;
  judges?: JudgeItem[];
}

interface PreviewConfig {
  previewModel: string | null;
  previewResolution: string | null;
}

interface JudgeItem {
  name?: string | null;
  judgeModel: string;
  judgeType: 'batch' | 'individual';
  toleranceThreshold: number;
  judgePromptVersionId: string;
  judgePromptVersionName?: string | null;
}

interface StrategySettingsPromptsProps {
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  groupProductImages?: boolean;
  /** Strategy check_scene_accuracy — scene drift vs reference before judge; may regenerate candidates. */
  checkSceneAccuracy?: boolean;
  description: string | null;
  steps: StepWithPrompt[];
  preview?: PreviewConfig;
}

export function StrategySettingsPrompts({
  model,
  aspectRatio,
  outputResolution,
  temperature,
  useGoogleSearch,
  tagImages,
  groupProductImages,
  checkSceneAccuracy,
  description,
  steps,
  preview,
}: StrategySettingsPromptsProps) {
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const viewingStep = viewingPromptId ? steps.find((s) => s.promptVersionId && s.promptVersionId === viewingPromptId) : null;

  const openPrompt = useCallback((promptVersionId: string) => setViewingPromptId(promptVersionId), []);
  const closePrompt = useCallback(() => setViewingPromptId(null), []);

  return (
    <>
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Strategy settings & prompt</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.model.bg} ${STRATEGY_PROPERTY_COLORS.model.text}`}>
            Model: {model}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.aspectRatio.bg} ${STRATEGY_PROPERTY_COLORS.aspectRatio.text}`}>
            Aspect: {aspectRatio}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.resolution.bg} ${STRATEGY_PROPERTY_COLORS.resolution.text}`}>
            Resolution: {outputResolution}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.temperature.bg} ${STRATEGY_PROPERTY_COLORS.temperature.text}`}>
            Temp: {temperature ?? '1'}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.tagImages.bg} ${STRATEGY_PROPERTY_COLORS.tagImages.text}`}>
            Tag images: {tagImages ? 'Yes' : 'No'}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.googleSearch.bg} ${STRATEGY_PROPERTY_COLORS.googleSearch.text}`}>
            Google Search: {useGoogleSearch ? 'Yes' : 'No'}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.groupImages.bg} ${STRATEGY_PROPERTY_COLORS.groupImages.text}`}>
            Group images: {groupProductImages ? 'Yes' : 'No'}
          </span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STRATEGY_PROPERTY_COLORS.sceneAccuracy.bg} ${STRATEGY_PROPERTY_COLORS.sceneAccuracy.text}`}>
            Check scene accuracy: {checkSceneAccuracy ? 'Yes' : 'No'}
          </span>
        </div>
        {preview?.previewModel && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h3 className="text-sm font-medium text-blue-800">Preview Generation</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                Model: {preview.previewModel}
              </span>
              {preview.previewResolution && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  Resolution: {preview.previewResolution}
                </span>
              )}
            </div>
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700">Pipeline steps</h3>
          <ul className="mt-2 space-y-2">
            {steps.map((step) => step.type === 'judge' ? (
              <li key={`judge-${step.stepOrder}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Step {step.stepOrder}: Judge
                  </span>
                  <span className="text-xs text-amber-700">
                    Generates {step.numberOfImages ?? 4} candidates, picks 1
                  </span>
                </div>
                {step.judges && step.judges.length > 0 && (
                  <div className="mt-2 divide-y divide-amber-200/60">
                    {step.judges.map((j, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5 first:pt-0 last:pb-0">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800">{i + 1}</span>
                        <div className="flex flex-1 flex-wrap items-center gap-1.5">
                          {j.name && <span className="text-xs font-semibold text-amber-900">{j.name}</span>}
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">{j.judgeType === 'batch' ? 'Batch' : 'Individual'}</span>
                          <span className="text-xs text-amber-700">{j.judgeModel}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-amber-700">
                          <span>Tolerance: {j.toleranceThreshold}/100</span>
                          {j.judgePromptVersionId && (
                            <Link href={`/prompt-versions/${j.judgePromptVersionId}`} className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200">
                              {j.judgePromptVersionName || 'View prompt'}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ) : (
              <li key={`gen-${step.stepOrder}`} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-900">
                  Step {step.stepOrder}
                  {step.name ? `: ${step.name}` : ''}
                </span>
                {step.promptVersionId && (
                  <>
                    <Link
                      href={`/prompt-versions/${step.promptVersionId}`}
                      className="text-primary-600 hover:text-primary-500"
                    >
                      {step.promptVersionName || 'Untitled'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => openPrompt(step.promptVersionId!)}
                      className="text-gray-500 hover:text-gray-700 underline"
                    >
                      View prompt
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {viewingPromptId && viewingStep && (
        <ViewPromptModal
          promptVersionId={viewingPromptId}
          promptVersionName={viewingStep.promptVersionName}
          onClose={closePrompt}
        />
      )}
    </>
  );
}
