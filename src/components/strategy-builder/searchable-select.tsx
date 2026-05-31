"use client";

import { SearchableSelect as UiSearchableSelect } from "@/components/ui/searchable-select";
import type { ModelOption } from "./types";

export function SearchableSelect({ id, value, options, onChange, placeholder = "-- Select --" }: { id?: string; value: string; options: ModelOption[]; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <UiSearchableSelect
      {...(id === undefined ? {} : { id })}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search models..."
      options={options.map((option) => ({ value: option.value, label: option.label, meta: option.meta ?? option.value }))}
    />
  );
}
