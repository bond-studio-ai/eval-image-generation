"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ViewPromptModal } from "@/components/view-prompt-modal";
import { STRATEGY_PROPERTY_COLORS } from "@/lib/strategy-property-colors";

interface StepWithPrompt {
  stepOrder: number;
  type: "generation" | "judge";
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
  judgeType: "batch" | "individual";
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
  enableMultiTurnContext?: boolean;
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
  enableMultiTurnContext,
  checkSceneAccuracy,
  description,
  steps,
  preview
}: StrategySettingsPromptsProps) {
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const viewingStep = viewingPromptId ? steps.find((s) => s.promptVersionId && s.promptVersionId === viewingPromptId) : null;

  const openPrompt = useCallback((promptVersionId: string) => setViewingPromptId(promptVersionId), []);
  const closePrompt = useCallback(() => setViewingPromptId(null), []);

  return (
    <>
      <div className="border-border bg-surface mt-8 rounded-lg border p-5 shadow-xs">
        <h2 className="text-text-primary text-h3">Strategy settings & prompt</h2>
        {description && <p className="text-text-secondary text-body mt-1">{description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.model.bg} ${STRATEGY_PROPERTY_COLORS.model.text}`}>Model: {model}</span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.aspectRatio.bg} ${STRATEGY_PROPERTY_COLORS.aspectRatio.text}`}>Aspect: {aspectRatio}</span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.resolution.bg} ${STRATEGY_PROPERTY_COLORS.resolution.text}`}>Resolution: {outputResolution}</span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.temperature.bg} ${STRATEGY_PROPERTY_COLORS.temperature.text}`}>Temp: {temperature ?? "1"}</span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.tagImages.bg} ${STRATEGY_PROPERTY_COLORS.tagImages.text}`}>Tag images: {tagImages ? "Yes" : "No"}</span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.googleSearch.bg} ${STRATEGY_PROPERTY_COLORS.googleSearch.text}`}>
            Google Search: {useGoogleSearch ? "Yes" : "No"}
          </span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.groupImages.bg} ${STRATEGY_PROPERTY_COLORS.groupImages.text}`}>
            Group images: {groupProductImages ? "Yes" : "No"}
          </span>
          <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${STRATEGY_PROPERTY_COLORS.sceneAccuracy.bg} ${STRATEGY_PROPERTY_COLORS.sceneAccuracy.text}`}>
            Check scene accuracy: {checkSceneAccuracy ? "Yes" : "No"}
          </span>
          <span className="bg-primary-50 text-primary-700 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">Multi-turn context: {enableMultiTurnContext ? "Yes" : "No"}</span>
        </div>
        {preview?.previewModel && (
          <div className="border-primary-200 bg-primary-50 mt-4 rounded-lg border p-3">
            <h3 className="text-primary-800 text-body font-medium">Preview Generation</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="bg-primary-100 text-primary-800 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">Model: {preview.previewModel}</span>
              {preview.previewResolution && <span className="bg-primary-100 text-primary-800 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium">Resolution: {preview.previewResolution}</span>}
            </div>
          </div>
        )}
        <div className="mt-4">
          <h3 className="text-text-secondary text-body font-medium">Pipeline steps</h3>
          <ul className="mt-2 space-y-2">
            {steps.map((step) =>
              step.type === "judge" ? (
                <li key={`judge-${step.stepOrder}`} className="border-warning-200 bg-warning-50 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-warning-100 text-warning-700 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold">Step {step.stepOrder}: Judge</span>
                    <span className="text-warning-700 text-caption">Generates {step.numberOfImages ?? 4} candidates, picks 1</span>
                  </div>
                  {step.judges && step.judges.length > 0 && (
                    <div className="divide-warning-200/60 mt-2 divide-y">
                      {step.judges.map((j, i) => (
                        <div key={j.judgePromptVersionId} className="flex items-center gap-3 py-1.5 first:pt-0 last:pb-0">
                          <span className="bg-warning-200 text-warning-800 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">{i + 1}</span>
                          <div className="flex flex-1 flex-wrap items-center gap-1.5">
                            {j.name && <span className="text-warning-900 text-caption font-semibold">{j.name}</span>}
                            <span className="bg-warning-100 text-warning-800 text-caption inline-flex items-center rounded-full px-2 py-0.5 font-medium">{j.judgeType === "batch" ? "Batch" : "Individual"}</span>
                            <span className="text-warning-700 text-caption">{j.judgeModel}</span>
                          </div>
                          <div className="text-warning-700 text-caption flex items-center gap-3">
                            <span>Tolerance: {j.toleranceThreshold}/100</span>
                            {j.judgePromptVersionId && (
                              <Link href={`/prompt-versions/${j.judgePromptVersionId}`} className="bg-warning-100 text-warning-800 hover:bg-warning-200 text-caption rounded-md px-2 py-0.5 font-medium">
                                {j.judgePromptVersionName || "View prompt"}
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ) : (
                <li key={`gen-${step.stepOrder}`} className="text-body flex items-center gap-3">
                  <span className="text-text-primary font-medium">
                    Step {step.stepOrder}
                    {step.name ? `: ${step.name}` : ""}
                  </span>
                  {step.promptVersionId && (
                    <>
                      <Link href={`/prompt-versions/${step.promptVersionId}`} className="text-primary-600 hover:text-primary-500">
                        {step.promptVersionName || "Untitled"}
                      </Link>
                      <button type="button" onClick={() => openPrompt(step.promptVersionId!)} className="text-text-muted hover:text-text-secondary underline">
                        View prompt
                      </button>
                    </>
                  )}
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {viewingPromptId && viewingStep && <ViewPromptModal promptVersionId={viewingPromptId} promptVersionName={viewingStep.promptVersionName} onClose={closePrompt} />}
    </>
  );
}
