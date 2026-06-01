"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ModelOption } from "./types";

/**
 * Domain wrapper over the `SearchableSelect` primitive for generation/judge model
 * pickers: maps `ModelOption[]` (falling back `meta` to the raw model id) and sets
 * the model-specific search placeholder. Parallel to `PromptVersionSelector`.
 */
export function ModelSelect({ id, value, options, onChange, placeholder = "-- Select --" }: { id?: string; value: string; options: ModelOption[]; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <SearchableSelect
      {...(id === undefined ? {} : { id })}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search models..."
      options={options.map((option) => ({ value: option.value, label: option.label, meta: option.meta ?? option.value }))}
    />
  );
}
