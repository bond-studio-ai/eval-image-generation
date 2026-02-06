'use client';

import { useCallback, useEffect, useState } from 'react';

// Issue options
const PRODUCT_ACCURACY_ISSUES = [
  'Incorrect scale',
  'Incorrect finish',
  "Didn't follow the reference image",
  'Incorrect tile pattern',
];

const SCENE_ACCURACY_ISSUES = [
  'Perspective drift',
  'Incorrect existing conditions',
  'Changed aspect ratio',
];

const INTEGRATION_ACCURACY_ISSUES = [
  'No reflection shown in mirror',
  'Unrealistic lighting & shadows',
  'Hallucinated details in the room',
];

interface EvaluationData {
  product_accuracy_categories: string[];
  product_accuracy_issues: string[];
  product_accuracy_notes: string;
  scene_accuracy_issues: string[];
  scene_accuracy_notes: string;
  integration_accuracy_issues: string[];
  integration_accuracy_notes: string;
}

interface ImageEvaluationFormProps {
  outputImageId: string;
  categories?: string[]; // Available product categories for multi-select
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
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
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
    <div>
      <p className="mb-2 text-xs font-medium text-gray-600">{label}</p>
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
    </div>
  );
}

function CategoryTagInput({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const addCategory = () => {
    const value = input.trim();
    if (value && !selected.includes(value)) {
      onChange([...selected, value]);
      setInput('');
    }
  };

  const removeCategory = (cat: string) => {
    onChange(selected.filter((c) => c !== cat));
  };

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-600">Inaccurate categories</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder="Type category and press Enter..."
          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={!input.trim()}
          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
            >
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImageEvaluationForm({ outputImageId }: ImageEvaluationFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section open/close state
  const [productOpen, setProductOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [integrationOpen, setIntegrationOpen] = useState(false);

  // Evaluation data
  const [data, setData] = useState<EvaluationData>({
    product_accuracy_categories: [],
    product_accuracy_issues: [],
    product_accuracy_notes: '',
    scene_accuracy_issues: [],
    scene_accuracy_notes: '',
    integration_accuracy_issues: [],
    integration_accuracy_notes: '',
  });

  // Load existing evaluation
  useEffect(() => {
    fetch(`/api/v1/evaluations/${outputImageId}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          setData({
            product_accuracy_categories: r.data.product_accuracy_categories ?? [],
            product_accuracy_issues: r.data.product_accuracy_issues ?? [],
            product_accuracy_notes: r.data.product_accuracy_notes ?? '',
            scene_accuracy_issues: r.data.scene_accuracy_issues ?? [],
            scene_accuracy_notes: r.data.scene_accuracy_notes ?? '',
            integration_accuracy_issues: r.data.integration_accuracy_issues ?? [],
            integration_accuracy_notes: r.data.integration_accuracy_notes ?? '',
          });

          // Auto-open sections that have data
          if (
            r.data.product_accuracy_categories?.length ||
            r.data.product_accuracy_issues?.length ||
            r.data.product_accuracy_notes
          ) {
            setProductOpen(true);
          }
          if (r.data.scene_accuracy_issues?.length || r.data.scene_accuracy_notes) {
            setSceneOpen(true);
          }
          if (r.data.integration_accuracy_issues?.length || r.data.integration_accuracy_notes) {
            setIntegrationOpen(true);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [outputImageId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch('/api/v1/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_image_id: outputImageId,
          ...data,
        }),
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
  }, [outputImageId, data]);

  // Check if any evaluation data exists
  const hasIssues =
    data.product_accuracy_categories.length > 0 ||
    data.product_accuracy_issues.length > 0 ||
    data.product_accuracy_notes ||
    data.scene_accuracy_issues.length > 0 ||
    data.scene_accuracy_notes ||
    data.integration_accuracy_issues.length > 0 ||
    data.integration_accuracy_notes;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
        <Spinner className="h-3 w-3" />
        Loading evaluation...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-700 uppercase">Evaluation</h4>
        {hasIssues && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Has issues
          </span>
        )}
      </div>

      {/* Product Accuracy */}
      <div className="rounded-md border border-gray-200">
        <button
          type="button"
          onClick={() => setProductOpen(!productOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            Product Accuracy
            {(data.product_accuracy_issues.length > 0 || data.product_accuracy_categories.length > 0) && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {data.product_accuracy_issues.length + data.product_accuracy_categories.length}
              </span>
            )}
          </span>
          <ChevronIcon open={productOpen} />
        </button>
        {productOpen && (
          <div className="space-y-3 border-t border-gray-200 px-3 py-3">
            <CategoryTagInput
              selected={data.product_accuracy_categories}
              onChange={(v) => setData({ ...data, product_accuracy_categories: v })}
            />
            <IssueCheckboxGroup
              label="High-level issues"
              options={PRODUCT_ACCURACY_ISSUES}
              selected={data.product_accuracy_issues}
              onChange={(v) => setData({ ...data, product_accuracy_issues: v })}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Notes</p>
              <textarea
                value={data.product_accuracy_notes}
                onChange={(e) => setData({ ...data, product_accuracy_notes: e.target.value })}
                placeholder="Provide more detail about what was incorrect..."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Scene Accuracy */}
      <div className="rounded-md border border-gray-200">
        <button
          type="button"
          onClick={() => setSceneOpen(!sceneOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            Scene Accuracy
            {data.scene_accuracy_issues.length > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {data.scene_accuracy_issues.length}
              </span>
            )}
          </span>
          <ChevronIcon open={sceneOpen} />
        </button>
        {sceneOpen && (
          <div className="space-y-3 border-t border-gray-200 px-3 py-3">
            <IssueCheckboxGroup
              label="High-level issues"
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

      {/* Integration Accuracy */}
      <div className="rounded-md border border-gray-200">
        <button
          type="button"
          onClick={() => setIntegrationOpen(!integrationOpen)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          <span className="flex items-center gap-2">
            Integration Accuracy
            {data.integration_accuracy_issues.length > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
                {data.integration_accuracy_issues.length}
              </span>
            )}
          </span>
          <ChevronIcon open={integrationOpen} />
        </button>
        {integrationOpen && (
          <div className="space-y-3 border-t border-gray-200 px-3 py-3">
            <IssueCheckboxGroup
              label="High-level issues"
              options={INTEGRATION_ACCURACY_ISSUES}
              selected={data.integration_accuracy_issues}
              onChange={(v) => setData({ ...data, integration_accuracy_issues: v })}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Notes</p>
              <textarea
                value={data.integration_accuracy_notes}
                onChange={(e) => setData({ ...data, integration_accuracy_notes: e.target.value })}
                placeholder="Provide more detail about what was incorrect..."
                rows={2}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          {saving ? (
            <>
              <Spinner className="h-3 w-3" />
              Saving...
            </>
          ) : (
            'Save Evaluation'
          )}
        </button>
        {saved && (
          <span className="text-xs font-medium text-green-600">Saved!</span>
        )}
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}
