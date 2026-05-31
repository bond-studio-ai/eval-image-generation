"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { parseOrFallback } from "@/lib/api/parse";
import { errorEnvelopeSchema, evaluationResponseSchema } from "@/lib/api/schemas";
import { CATEGORY_LABELS, CATEGORY_SPECIFIC_ISSUES } from "@/lib/validation";

const EMPTY_CATEGORIES: string[] = [];

// Issue options
const PRODUCT_ACCURACY_ISSUES = ["Incorrect scale", "Incorrect finish", "Didn't follow the reference image", "Incorrect tile pattern"];

const SCENE_ACCURACY_ISSUES = ["Unrealistic lighting & shadows", "Perspective drift", "Incorrect existing conditions", "Changed aspect ratio", "Hallucinated details in the room"];

function toSnakeCase(str: string): string {
  return str.replaceAll(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

/** Per-category product accuracy data */
interface CategoryEval {
  issues: string[];
  notes: string;
}

interface EvaluationData {
  productAccuracy: Record<string, CategoryEval>;
  sceneAccuracyIssues: string[];
  sceneAccuracyNotes: string;
}

interface ImageEvaluationFormProps {
  resultId: string;
  /** Product category keys (snake_case) that were used as inputs for this generation */
  productCategories?: string[];
}

function IssueCheckboxGroup({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (selected: string[]) => void }) {
  const toggle = (issue: string) => {
    if (selected.includes(issue)) {
      onChange(selected.filter((item) => item !== issue));
    } else {
      onChange([...selected, issue]);
    }
  };

  return (
    <div className="space-y-1.5">
      {options.map((issue) => (
        <label key={issue} className="text-text-secondary text-body flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(issue)}
            onChange={() => {
              toggle(issue);
            }}
            className="text-primary-600 focus:ring-primary-500 border-border-strong size-3.5 rounded"
          />
          {issue}
        </label>
      ))}
    </div>
  );
}

export function ImageEvaluationForm({ resultId, productCategories = EMPTY_CATEGORIES }: ImageEvaluationFormProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section open/close state
  const [productOpen, setProductOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);

  // Evaluation data
  const [data, setData] = useState<EvaluationData>({
    productAccuracy: {},
    sceneAccuracyIssues: [],
    sceneAccuracyNotes: ""
  });

  // Track whether the initial load has completed so we don't auto-save the
  // default / loaded state.
  const loadedRef = useRef(false);

  // Load existing evaluation
  const { data: loadedData, isLoading: loading } = useQuery({
    queryKey: ["evaluation", resultId, productCategories],
    queryFn: async ({ signal }): Promise<EvaluationData> => {
      const json = await fetchJson(serviceUrl(`evaluations/${resultId}`), evaluationResponseSchema, { signal });
      const payload = json.data;
      if (payload) {
        const rawPa = payload.productAccuracy;
        const pa: Record<string, CategoryEval> = {};
        for (const [key, val] of Object.entries(rawPa)) {
          const normalized = toSnakeCase(key);
          const existing = pa[normalized];
          const categoryEval = val;
          if (existing && existing.issues.length > 0) continue;
          pa[normalized] = categoryEval;
        }
        const productAccuracy: Record<string, CategoryEval> = {};
        for (const cat of productCategories) {
          productAccuracy[cat] = pa[cat] ?? { issues: [], notes: "" };
        }
        for (const [key, val] of Object.entries(pa)) {
          productAccuracy[key] ||= val;
        }

        return {
          productAccuracy,
          sceneAccuracyIssues: payload.sceneAccuracyIssues ?? [],
          sceneAccuracyNotes: payload.sceneAccuracyNotes ?? ""
        };
      }
      // Initialize empty product accuracy for all active categories
      const productAccuracy: Record<string, CategoryEval> = {};
      for (const cat of productCategories) {
        productAccuracy[cat] = { issues: [], notes: "" };
      }
      return { productAccuracy, sceneAccuracyIssues: [], sceneAccuracyNotes: "" };
    }
  });

  // Seed the editable form state from the loaded evaluation. Marking loaded
  // after a tick keeps the auto-save effect from firing on the initial state.
  useEffect(() => {
    if (!loadedData) return;
    setData(loadedData);
    requestAnimationFrame(() => {
      loadedRef.current = true;
    });
  }, [loadedData]);

  const updateCategoryEval = useCallback((category: string, field: "issues" | "notes", value: string[] | string) => {
    setData((prev) => {
      const existing = prev.productAccuracy[category] ?? { issues: [], notes: "" };
      const updatedCategory: CategoryEval = { ...existing, [field]: value };
      const productAccuracy: Record<string, CategoryEval> = { ...prev.productAccuracy, [category]: updatedCategory };
      return { ...prev, productAccuracy };
    });
  }, []);

  // Persist evaluation to the server.
  const save = useCallback(
    async (payload: EvaluationData) => {
      setSaving(true);
      setSaved(false);
      setError(null);

      try {
        const res = await fetch(serviceUrl("evaluations"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId, ...payload })
        });

        if (!res.ok) {
          const json: unknown = await res.json();
          const parsed = parseOrFallback(errorEnvelopeSchema, json, {}, "evaluation save error");
          setError(parsed.error?.message || "Failed to save");
          return;
        }

        setSaved(true);
        setTimeout(() => {
          setSaved(false);
        }, 2000);
      } catch {
        setError("Network error");
      } finally {
        setSaving(false);
      }
    },
    [resultId]
  );

  const onSave = useEffectEvent(save);

  // Auto-save whenever evaluation data changes (debounced 800ms for notes,
  // but the effect fires on every change).
  useEffect(() => {
    if (!loadedRef.current) return;
    const timer = setTimeout(() => {
      void onSave(data);
    }, 800);
    return () => {
      clearTimeout(timer);
    };
  }, [data]);

  // Count total issues
  const totalProductIssues = Object.values(data.productAccuracy).reduce((sum, cat) => sum + cat.issues.length, 0);
  const totalSceneIssues = data.sceneAccuracyIssues.length;

  // Collect all active issue labels for the tag strip
  const allIssueTags: { label: string; color: "red" | "amber" }[] = [];
  for (const issue of data.sceneAccuracyIssues) {
    allIssueTags.push({ label: issue, color: "red" });
  }
  for (const [category, catData] of Object.entries(data.productAccuracy)) {
    const catLabel = CATEGORY_LABELS[category] ?? category;
    for (const issue of catData.issues) {
      allIssueTags.push({ label: `${catLabel}: ${issue}`, color: "amber" });
    }
  }

  if (loading) {
    return (
      <div className="text-text-muted text-body flex items-center gap-2 py-2">
        <Spinner className="size-3" />
        Loading evaluation…
      </div>
    );
  }

  const activeCategories = Object.keys(data.productAccuracy);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-text-secondary text-caption font-semibold uppercase">Evaluation</h4>
        <div className="flex items-center gap-2">
          {saving && <Spinner className="text-text-disabled size-3" />}
          {saved && <span className="text-success-600 text-caption font-medium">Saved</span>}
          {error && <span className="text-danger-600 text-caption">{error}</span>}
        </div>
      </div>

      {/* Issue tags */}
      {allIssueTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allIssueTags.map((tag) => (
            <span key={tag.label} className={`text-caption inline-flex items-center rounded-full px-2 py-0.5 font-medium ${tag.color === "red" ? "bg-danger-100 text-danger-700" : "bg-warning-100 text-warning-700"}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Scene Accuracy (first) */}
      <div className="border-border rounded-md border">
        <button
          type="button"
          onClick={() => {
            setSceneOpen(!sceneOpen);
          }}
          className="text-text-secondary hover:bg-surface-muted text-body flex w-full items-center justify-between px-3 py-2 text-left font-medium"
        >
          <span className="flex items-center gap-2">
            Scene Accuracy
            {totalSceneIssues > 0 && <span className="bg-danger-100 text-danger-600 text-caption rounded-full px-1.5 py-0.5">{totalSceneIssues}</span>}
          </span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${sceneOpen ? "rotate-180" : ""}`} />
        </button>
        {sceneOpen && (
          <div className="border-border space-y-3 border-t p-3">
            <IssueCheckboxGroup
              options={SCENE_ACCURACY_ISSUES}
              selected={data.sceneAccuracyIssues}
              onChange={(issues) => {
                setData({ ...data, sceneAccuracyIssues: issues });
              }}
            />
            <div>
              <p className="text-text-secondary text-caption mb-1 font-medium">Notes</p>
              <textarea
                value={data.sceneAccuracyNotes}
                onChange={(e) => {
                  setData({ ...data, sceneAccuracyNotes: e.target.value });
                }}
                aria-label="Scene accuracy notes"
                placeholder="Provide more detail about what was incorrect..."
                rows={2}
                className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-md border px-2 py-1.5 focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Product Accuracy (always shown; empty state when no product refs) */}
      <div className="border-border rounded-md border">
        <button
          type="button"
          onClick={() => {
            setProductOpen(!productOpen);
          }}
          className="text-text-secondary hover:bg-surface-muted text-body flex w-full items-center justify-between px-3 py-2 text-left font-medium"
        >
          <span className="flex items-center gap-2">
            Product Accuracy
            {totalProductIssues > 0 && <span className="bg-danger-100 text-danger-600 text-caption rounded-full px-1.5 py-0.5">{totalProductIssues}</span>}
          </span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${productOpen ? "rotate-180" : ""}`} />
        </button>
        {productOpen && (
          <div className="border-border space-y-4 border-t p-3">
            {activeCategories.length > 0 ? (
              activeCategories.map((category) => {
                const catData = data.productAccuracy[category] ?? { issues: [], notes: "" };
                const label = CATEGORY_LABELS[category] ?? category;
                const categoryIssues = CATEGORY_SPECIFIC_ISSUES[category];
                const issueOptions = categoryIssues ? [...PRODUCT_ACCURACY_ISSUES, ...categoryIssues] : Array.from(PRODUCT_ACCURACY_ISSUES);
                return (
                  <div key={category} className="border-border-subtle bg-surface-muted/50 rounded border p-3">
                    <p className="text-text-secondary text-caption mb-2 font-semibold">{label}</p>
                    <IssueCheckboxGroup
                      options={issueOptions}
                      selected={catData.issues}
                      onChange={(issues) => {
                        updateCategoryEval(category, "issues", issues);
                      }}
                    />
                    <div className="mt-2">
                      <textarea
                        value={catData.notes}
                        onChange={(e) => {
                          updateCategoryEval(category, "notes", e.target.value);
                        }}
                        aria-label={`${label} notes`}
                        placeholder="Notes about this category..."
                        rows={2}
                        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded-md border px-2 py-1.5 focus:ring-1 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-text-muted text-body">No product references were used for this generation.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
