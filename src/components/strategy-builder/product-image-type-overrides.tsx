"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { categoryLabel, DEFAULT_IMAGE_TYPE, IMAGE_TYPE_OPTIONS, normalizeProductImageType, PRODUCT_CATEGORIES, type ProductImageType } from "./types";

function ImageTypePill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${active ? "border-primary-300 bg-primary-50 text-primary-700" : "border-border bg-surface text-text-muted hover:border-border-strong"}`}
    >
      {label}
    </button>
  );
}

export function ProductImageTypeOverrides({ value, onChange }: { value: Record<string, ProductImageType>; onChange: (v: Record<string, ProductImageType>) => void }) {
  const [expanded, setExpanded] = useState(true);
  const nonDefaultCount = PRODUCT_CATEGORIES.filter((cat) => (value[cat] ?? DEFAULT_IMAGE_TYPE) !== DEFAULT_IMAGE_TYPE).length;

  const setCategory = (cat: string, type: ProductImageType) => {
    const next = { ...value, [cat]: normalizeProductImageType(type) };
    onChange(next);
  };

  const setAll = (type: ProductImageType) => {
    const next: Record<string, ProductImageType> = {};
    for (const cat of PRODUCT_CATEGORIES) next[cat] = type;
    onChange(next);
  };

  return (
    <div className="border-border bg-surface-muted mt-3 rounded-lg border p-4">
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded);
        }}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-text-secondary text-caption font-medium">
          Product Image Types
          {nonDefaultCount > 0 && <span className="bg-primary-50 text-primary-700 ring-primary-200 ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset">{nonDefaultCount} non-default</span>}
        </span>
        <ChevronDownIcon className={`text-text-disabled size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-text-muted text-[11px] font-medium">Set all:</span>
            {IMAGE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAll(option.value);
                }}
                className="border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-text-muted mb-3 text-[11px]">If the selected image type is unavailable for a product, generation falls back to the featured image.</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {PRODUCT_CATEGORIES.map((cat) => {
              const current = normalizeProductImageType(value[cat]);
              return (
                <div key={cat} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-text-secondary text-caption min-w-0 truncate" title={categoryLabel(cat)}>
                    {categoryLabel(cat)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {IMAGE_TYPE_OPTIONS.map((option) => (
                      <ImageTypePill
                        key={option.value}
                        active={current === option.value}
                        label={option.label}
                        onClick={() => {
                          setCategory(cat, option.value);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
