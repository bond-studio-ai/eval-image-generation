"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import type { PromptVersionListItem } from "@/lib/types";

export function PromptVersionSelector({ value, id, promptVersions, onChange }: { id?: string; value: string; promptVersions: PromptVersionListItem[]; onChange: (id: string) => void }) {
  return (
    <SearchableSelect
      {...(id === undefined ? {} : { id })}
      value={value}
      onChange={onChange}
      placeholder="-- Select --"
      searchPlaceholder="Filter prompts..."
      includeNone
      options={promptVersions.map((pv) => ({
        value: pv.id,
        label: pv.name || "Untitled",
        ...(pv.stats?.generationCount ? { meta: `${pv.stats.generationCount} gen` } : {}),
        keywords: [pv.systemPrompt ?? "", pv.userPrompt ?? ""]
      }))}
    />
  );
}
