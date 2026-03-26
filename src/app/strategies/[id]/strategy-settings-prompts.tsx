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
        {judges && judges.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
              </svg>
              <h3 className="text-sm font-medium text-amber-800">
                {judges.length === 1 ? 'Judge' : `Judges (${judges.length})`}
              </h3>
            </div>
            <div className="mt-3 divide-y divide-amber-200/60">
              {judges.map((j, i) => {
                const totalWeight = judges.reduce((sum, jj) => sum + jj.weight, 0);
                const pct = totalWeight > 0 ? Math.round((j.weight / totalWeight) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-800">
                      {i + 1}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {j.judgeType === 'batch' ? 'Batch' : 'Individual'}
                      </span>
                      <span className="text-xs text-amber-700">{j.judgeModel}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-amber-700">
                      <span title="Weight">
                        W: {j.weight}{judges.length > 1 && <span className="text-amber-500"> ({pct}%)</span>}
                      </span>
                      <span title="Tolerance threshold">T: {j.toleranceThreshold}/100</span>
                      {j.judgePromptVersionId && (
                        <Link
                          href={`/prompt-versions/${j.judgePromptVersionId}`}
                          className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
                        >
                          Prompt
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
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
