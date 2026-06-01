"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";
import type { StrategyListItem } from "@/lib/service-client";

export function StrategyDropdown({ value, strategies, onChange }: { value: string; strategies: StrategyListItem[]; onChange: (strategyId: string) => void }) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      placeholder="Select strategy…"
      searchPlaceholder="Search strategies…"
      emptyMessage="No matching strategies"
      triggerClassName="text-caption px-2.5 py-1.5"
      options={strategies.map((strategy) => ({ value: strategy.id, label: strategy.name }))}
    />
  );
}
