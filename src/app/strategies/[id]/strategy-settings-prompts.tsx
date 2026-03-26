'use client';

import { ViewPromptModal } from '@/components/view-prompt-modal';
import { STRATEGY_PROPERTY_COLORS } from '@/lib/strategy-property-colors';
import Link from 'next/link';
import { useCallback, useState } from 'react';

interface StepWithPrompt {
  stepOrder: number;
  name: string | null;
  promptVersionId: string;
  promptVersionName: string | null;
}

interface JudgeConfig {
  judgeType: 'batch' | 'individual' | null;
  judgeModel: string | null;
  judgePromptVersionId: string | null;
  judgePromptVersionName: string | null;
}

interface PreviewConfig {
  previewModel: string | null;
  previewResolution: string | null;
}

interface JudgeItem {
  judgeModel: string;
  judgeType: 'batch' | 'individual';
  weight: number;
  toleranceThreshold: number;
  judgePromptVersionId: string;
}

interface StrategySettingsPromptsProps {
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  groupProductImages?: boolean;
  description: string | null;
  steps: StepWithPrompt[];
  judge?: JudgeConfig;
  judges?: JudgeItem[];
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
  description,
  steps,
  judge,
  judges,
  preview,
}: StrategySettingsPromptsProps) {
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const viewingStep = viewingPromptId ? steps.find((s) => s.promptVersionId === viewingPromptId) : null;

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
        </div>
        {judge?.judgeType && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h3 className="text-sm font-medium text-amber-800">Judge System</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Mode: {judge.judgeType === 'batch' ? 'Batch' : 'Individual'}
              </span>
              {judge.judgeModel && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Model: {judge.judgeModel}
                </span>
              )}
              {judge.judgePromptVersionName && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Prompt: {judge.judgePromptVersionName}
                </span>
              )}
              {judge.judgePromptVersionId && !judge.judgePromptVersionName && (
                <Link
                  href={`/prompt-versions/${judge.judgePromptVersionId}`}
                  className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
                >
                  View judge prompt
                </Link>
              )}
            </div>
          </div>
        )}
        {judges && judges.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <h3 className="text-sm font-medium text-amber-800">Judges ({judges.length})</h3>
            <div className="mt-2 space-y-2">
              {judges.map((j, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    #{i + 1} {j.judgeType === 'batch' ? 'Batch' : 'Individual'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {j.judgeModel}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Weight: {j.weight}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    Threshold: {j.toleranceThreshold}
                  </span>
                  {j.judgePromptVersionId && (
                    <Link
                      href={`/prompt-versions/${j.judgePromptVersionId}`}
                      className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
                    >
                      View prompt
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
          <h3 className="text-sm font-medium text-gray-700">Prompts by step</h3>
          <ul className="mt-2 space-y-2">
            {steps.map((step) => (
              <li key={step.promptVersionId + step.stepOrder} className="flex items-center gap-3 text-sm">
                <span className="font-medium text-gray-900">
                  Step {step.stepOrder}
                  {step.name ? `: ${step.name}` : ''}
                </span>
                <Link
                  href={`/prompt-versions/${step.promptVersionId}`}
                  className="text-primary-600 hover:text-primary-500"
                >
                  {step.promptVersionName || 'Untitled'}
                </Link>
                <button
                  type="button"
                  onClick={() => openPrompt(step.promptVersionId)}
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  View prompt
                </button>
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
