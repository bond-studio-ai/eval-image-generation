'use client';

import { useState } from 'react';
import { useEvaluation, type EvaluationData } from '@/hooks/matrix/use-evaluation';

const SCENE_ISSUES = [
  'Unrealistic lighting & shadows',
  'Perspective drift',
  'Incorrect existing conditions',
  'Changed aspect ratio',
  'Hallucinated details in the room',
] as const;

const PRODUCT_ISSUES = [
  'Incorrect scale',
  'Incorrect finish',
  "Didn't follow the reference image",
  'Incorrect tile pattern',
] as const;

interface OutputEvaluationCardProps {
  resultId: string;
}

function Chip({
  label,
  selected,
  onToggle,
  variant = 'default',
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  variant?: 'default' | 'amber';
}) {
  const base =
    'inline-flex cursor-pointer select-none items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors';
  const unselected =
    'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50';
  const selectedDefault = 'border-primary-500 bg-primary-50 text-primary-800 ring-1 ring-primary-500/30';
  const selectedAmber = 'border-amber-400 bg-amber-50 text-amber-800 ring-1 ring-amber-400/30';
  const selectedClass = variant === 'amber' ? selectedAmber : selectedDefault;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${base} ${selected ? selectedClass : unselected}`}
    >
      {label}
    </button>
  );
}

const DEFAULT_DATA: EvaluationData = {
  product_accuracy: {},
  scene_accuracy_issues: [],
  scene_accuracy_notes: '',
};

export function OutputEvaluationCard({ resultId }: OutputEvaluationCardProps) {
  const { data, isLoading, isSaving, save } = useEvaluation(resultId);
  /** Draft edits; null means use server data (or default). */
  const [draft, setDraft] = useState<EvaluationData | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  const local = draft ?? data ?? DEFAULT_DATA;

  const toggleScene = (issue: string) => {
    const prev = draft ?? data ?? DEFAULT_DATA;
    setDraft({
      ...prev,
      scene_accuracy_issues: prev.scene_accuracy_issues.includes(issue)
        ? prev.scene_accuracy_issues.filter((s) => s !== issue)
        : [...prev.scene_accuracy_issues, issue],
    });
  };

  const toggleProduct = (issue: string) => {
    const prev = draft ?? data ?? DEFAULT_DATA;
    const key = 'default';
    const current = prev.product_accuracy[key] ?? { issues: [], notes: '' };
    const issues = current.issues.includes(issue)
      ? current.issues.filter((s) => s !== issue)
      : [...current.issues, issue];
    setDraft({
      ...prev,
      product_accuracy: { ...prev.product_accuracy, [key]: { ...current, issues } },
    });
  };

  const handleSave = () => {
    save(local, {
      onSuccess: () => {
        setDraft(null);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-6 text-sm text-gray-500">
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" aria-hidden />
        Loading evaluation…
      </div>
    );
  }

  const productDefault = local.product_accuracy['default'] ?? { issues: [], notes: '' };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">Output evaluation</h3>
        <p className="mt-0.5 text-xs text-gray-500">Select issues that apply to this image.</p>
      </div>
      <div className="space-y-5 p-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Scene accuracy</p>
          <div className="flex flex-wrap gap-2">
            {SCENE_ISSUES.map((issue) => (
              <Chip
                key={issue}
                label={issue}
                selected={local.scene_accuracy_issues.includes(issue)}
                onToggle={() => toggleScene(issue)}
              />
            ))}
          </div>
          <textarea
            value={local.scene_accuracy_notes}
            onChange={(e) => setDraft((p) => ({ ...(p ?? data ?? DEFAULT_DATA), scene_accuracy_notes: e.target.value }))}
            placeholder="Notes (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Product accuracy</p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_ISSUES.map((issue) => (
              <Chip
                key={issue}
                label={issue}
                selected={productDefault.issues.includes(issue)}
                onToggle={() => toggleProduct(issue)}
                variant="amber"
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save evaluation'}
          </button>
          {showSaved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
