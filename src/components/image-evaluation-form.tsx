'use client';

import { CATEGORY_LABELS } from '@/lib/validation';
import { useCallback, useEffect, useRef, useState } from 'react';

// Issue options
const PRODUCT_ACCURACY_ISSUES = [
  'Incorrect scale',
  'Incorrect finish',
  "Didn't follow the reference image",
  'Incorrect tile pattern',
];

const SCENE_ACCURACY_ISSUES = [
  'Unrealistic lighting & shadows',
  'Perspective drift',
  'Incorrect existing conditions',
  'Changed aspect ratio',
  'Hallucinated details in the room',
];

/** Per-category product accuracy data */
interface CategoryEval {
  issues: string[];
  notes: string;
}

interface EvaluationData {
  product_accuracy: Record<string, CategoryEval>;
  scene_accuracy_issues: string[];
  scene_accuracy_notes: string;
}

interface ImageEvaluationFormProps {
  resultId: string;
  /** Product category keys (snake_case) that were used as inputs for this generation */
  productCategories?: string[];
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function IssueCheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const toggle = (issue: string) => {
    if (selected.includes(issue)) {
      onChange(selected.filter((s) => s !== issue));
    } else {
      onChange([...selected, issue]);
    }
  };

  return (
    <div className="space-y-1.5">
      {options.map((issue) => (
        <label key={issue} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={selected.includes(issue)}
            onChange={() => toggle(issue)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          {issue}
        </label>
      ))}
    </div>
  );
}

export function ImageEvaluationForm({ resultId, productCategories = [] }: ImageEvaluationFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section open/close state
  const [productOpen, setProductOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);

  // Evaluation data
  const [data, setData] = useState<EvaluationData>({
    product_accuracy: {},
    scene_accuracy_issues: [],
    scene_accuracy_notes: '',
  });

  // Track whether the initial load has completed so we don't auto-save the
  // default / loaded state.
  const loadedRef = useRef(false);

  // Load existing evaluation
  useEffect(() => {
    fetch(`/api/v1/evaluations/${resultId}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          const pa = r.data.product_accuracy ?? {};
          // Ensure each active category has an entry
          const productAccuracy: Record<string, CategoryEval> = {};
          for (const cat of productCategories) {
            productAccuracy[cat] = pa[cat] ?? { issues: [], notes: '' };
          }
          // Also include any categories that were saved but might not be in current productCategories
          for (const [key, val] of Object.entries(pa)) {
            if (!productAccuracy[key]) {
              productAccuracy[key] = val as CategoryEval;
            }
          }

          setData({
            product_accuracy: productAccuracy,
            scene_accuracy_issues: r.data.scene_accuracy_issues ?? [],
            scene_accuracy_notes: r.data.scene_accuracy_notes ?? '',
          });

          // Keep sections collapsed by default (user opens when needed)
        } else {
          // Initialize empty product accuracy for all active categories
          const productAccuracy: Record<string, CategoryEval> = {};
          for (const cat of productCategories) {
            productAccuracy[cat] = { issues: [], notes: '' };
          }
          setData((prev) => ({ ...prev, product_accuracy: productAccuracy }));
        }
        setLoading(false);
        // Mark loaded after a tick so the auto-save effect skips the initial state.
        requestAnimationFrame(() => {
          loadedRef.current = true;
        });
      })
      .catch(() => setLoading(false));
  }, [resultId, productCategories]);

  const updateCategoryEval = useCallback(
    (category: string, field: 'issues' | 'notes', value: string[] | string) => {
      setData((prev) => ({
        ...prev,
        product_accuracy: {
          ...prev.product_accuracy,
          [category]: {
            ...prev.product_accuracy[category],
            [field]: value,
          },
        },
      }));
    },
    [],
  );

  // Persist evaluation to the server.
  const save = useCallback(
    async (payload: EvaluationData) => {
      setSaving(true);
      setSaved(false);
      setError(null);

      try {
        const res = await fetch('/api/v1/evaluations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result_id: resultId, ...payload }),
        });

        if (!res.ok) {
          const json = await res.json();
          setError(json.error?.message || 'Failed to save');
          return;
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError('Network error');
      } finally {
        setSaving(false);
      }
    },
    [resultId],
  );

  // Auto-save whenever evaluation data changes (debounced 800ms for notes,
  // but the effect fires on every change).
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      save(data);
    }, 800);
    return () => clearTimeout(timer);
  }, [data, save]);

  // Count total issues
  const totalProductIssues = Object.values(data.product_accuracy).reduce(
    (sum, cat) => sum + cat.issues.length,
    0,
  );
  const totalSceneIssues = data.scene_accuracy_issues.length;

  // Collect all active issue labels for the tag strip
  const allIssueTags: { label: string; color: 'red' | 'amber' }[] = [];
  for (const issue of data.scene_accuracy_issues) {
    allIssueTags.push({ label: issue, color: 'red' });
  }
  for (const [category, catData] of Object.entries(data.product_accuracy)) {
    const catLabel = CATEGORY_LABELS[category] ?? category;
    for (const issue of catData.issues) {
      allIssueTags.push({ label: `${catLabel}: ${issue}`, color: 'amber' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
        <Spinner className="h-3 w-3" />
        Loading evaluation...
      </div>
    );
  }

  const activeCategories = Object.keys(data.product_accuracy);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-700 uppercase">Evaluation</h4>
        <div className="flex items-center gap-2">
          {saving && <Spinner className="h-3 w-3 text-gray-400" />}
          {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      {/* Issue tags */}
      {allIssueTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allIssueTags.map((tag) => (
            <span
              key={tag.label}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                tag.color === 'red'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Scene Accuracy (first) */}
      <div className="rounded-md border border-gray-200">
        <button
          type="button"
          onClick={() => setSceneOpen(!sceneOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            Scene Accuracy
            {totalSceneIssues > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {totalSceneIssues}
              </span>
            )}
          </span>
          <ChevronIcon open={sceneOpen} />
        </button>
        {sceneOpen && (
          <div className="space-y-3 border-t border-gray-200 px-3 py-3">
            <IssueCheckboxGroup
              options={SCENE_ACCURACY_ISSUES}
              selected={data.scene_accuracy_issues}
              onChange={(v) => setData({ ...data, scene_accuracy_issues: v })}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Notes</p>
              <textarea
                value={data.scene_accuracy_notes}
                onChange={(e) => setData({ ...data, scene_accuracy_notes: e.target.value })}
                placeholder="Provide more detail about what was incorrect..."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Accuracy (always shown; empty state when no product refs) */}
      <div className="rounded-md border border-gray-200">
        <button
          type="button"
          onClick={() => setProductOpen(!productOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            Product Accuracy
            {totalProductIssues > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {totalProductIssues}
              </span>
            )}
          </span>
          <ChevronIcon open={productOpen} />
        </button>
        {productOpen && (
          <div className="space-y-4 border-t border-gray-200 px-3 py-3">
            {activeCategories.length > 0 ? (
              activeCategories.map((category) => {
                const catData = data.product_accuracy[category] ?? { issues: [], notes: '' };
                const label = CATEGORY_LABELS[category] ?? category;
                return (
                  <div key={category} className="rounded border border-gray-100 bg-gray-50/50 p-3">
                    <p className="mb-2 text-xs font-semibold text-gray-700">{label}</p>
                    <IssueCheckboxGroup
                      options={PRODUCT_ACCURACY_ISSUES}
                      selected={catData.issues}
                      onChange={(v) => updateCategoryEval(category, 'issues', v)}
                    />
                    <div className="mt-2">
                      <textarea
                        value={catData.notes}
                        onChange={(e) => updateCategoryEval(category, 'notes', e.target.value)}
                        placeholder="Notes about this category..."
                        rows={2}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No product references were used for this generation.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
