'use client';

import { ViewPromptModal } from '@/components/view-prompt-modal';
import Link from 'next/link';
import { useCallback, useState } from 'react';

interface StepWithPrompt {
  stepOrder: number;
  name: string | null;
  promptVersionId: string;
  promptVersionName: string | null;
}

interface StrategySettingsPromptsProps {
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  description: string | null;
  steps: StepWithPrompt[];
}

export function StrategySettingsPrompts({
  model,
  aspectRatio,
  outputResolution,
  temperature,
  useGoogleSearch,
  tagImages,
  description,
  steps,
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
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Model: {model}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Aspect: {aspectRatio}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Resolution: {outputResolution}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Temp: {temperature ?? '1'}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Tag images: {tagImages ? 'Yes' : 'No'}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            Google Search: {useGoogleSearch ? 'Yes' : 'No'}
          </span>
        </div>
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
