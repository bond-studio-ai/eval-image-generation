"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { type AnalyticsComparisonColumn, type AnalyticsComparisonSource, COMPARE_COLUMN_QUERY_KEY, createEmptyComparisonColumn, encodeComparisonColumn, parseComparisonState } from "@/app/analytics/comparison-utils";
import { browserTimezone } from "@/lib/api-base";
import type { StrategyListItem } from "@/lib/service-client";
import { ComparisonColumnsEditor } from "./_analytics-filters/comparison-columns-editor";
import { PrimaryFilters } from "./_analytics-filters/primary-filters";

interface AnalyticsFiltersProps {
  models: string[];
  strategies: StrategyListItem[];
  activeTab: string;
}

function AnalyticsFiltersInner({ models, strategies, activeTab }: AnalyticsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompare = activeTab === "compare";

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const model = searchParams.get("model") ?? "";
  const source = searchParams.get("source") ?? "all";
  // Memoize on the serialized params: `parseComparisonState` mints a fresh
  // `crypto.randomUUID()` for legacy (pre-id) columns, so re-parsing on every
  // render would hand the editor unstable React keys. Same params → same ids.
  const comparison = useMemo(() => parseComparisonState(searchParams), [searchParams]);

  const defaultSource: AnalyticsComparisonSource = source === "raw_input" ? "raw_input" : source === "benchmark" ? "benchmark" : "preset";

  // Show a starter column when entering compare mode with none yet. It lives in
  // memory (not the URL) until the user edits it, which avoids a redirect-in-
  // effect; the memoized id keeps the row's inputs from remounting each render
  // and round-trips into the URL on the first edit.
  const defaultColumn = useMemo(() => createEmptyComparisonColumn({ from, to, source: defaultSource }), [from, to, defaultSource]);
  const columns = isCompare && comparison.columns.length === 0 ? [defaultColumn] : comparison.columns;

  // `addComparisonColumn` reads the latest columns from a ref (it's an event
  // handler, not render-path), so keep the ref in sync via an effect rather
  // than writing it during render.
  const columnsRef = useRef(columns);
  useEffect(() => {
    columnsRef.current = columns;
  });

  const buildUrl = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      return `/?${next}`;
    },
    [searchParams]
  );

  const applyFilters = useCallback(
    (overrides: Record<string, string>) => {
      router.replace(
        buildUrl((next) => {
          for (const [key, value] of Object.entries(overrides)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          const tz = browserTimezone();
          if (tz && (next.has("from") || next.has("to"))) next.set("tz", tz);
          else next.delete("tz");
        })
      );
    },
    [router, buildUrl]
  );

  const updateComparisonColumns = useCallback(
    (nextColumns: AnalyticsComparisonColumn[]) => {
      router.replace(
        buildUrl((next) => {
          next.delete(COMPARE_COLUMN_QUERY_KEY);
          for (const column of nextColumns) {
            next.append(COMPARE_COLUMN_QUERY_KEY, encodeComparisonColumn(column));
          }
        })
      );
    },
    [router, buildUrl]
  );

  const addComparisonColumn = useCallback(() => {
    const cols = columnsRef.current;
    const lastColumn = cols.at(-1);
    const nextDefaultSource: AnalyticsComparisonSource = source === "raw_input" ? "raw_input" : source === "benchmark" ? "benchmark" : "preset";
    updateComparisonColumns([...cols, createEmptyComparisonColumn(lastColumn ?? { from, to, source: nextDefaultSource })]);
  }, [from, source, to, updateComparisonColumns]);

  const clearAll = useCallback(() => {
    const tab = searchParams.get("tab");
    const next = new URLSearchParams();
    if (tab) next.set("tab", tab);
    const suffix = next.toString() ? `?${next.toString()}` : "";
    router.replace(`/${suffix}`);
  }, [router, searchParams]);

  const hasDateFilter = Boolean(from || to);
  const hasAnyFilter = hasDateFilter || Boolean(model) || source !== "all";

  return (
    <div className="mt-4 flex flex-col gap-3">
      <PrimaryFilters models={models} isCompare={isCompare} from={from} to={to} model={model} source={source} hasDateFilter={hasDateFilter} hasAnyFilter={hasAnyFilter} applyFilters={applyFilters} clearAll={clearAll} />

      {isCompare && <ComparisonColumnsEditor columns={columns} strategies={strategies} updateComparisonColumns={updateComparisonColumns} addComparisonColumn={addComparisonColumn} />}
    </div>
  );
}

export function AnalyticsFilters(props: AnalyticsFiltersProps) {
  return (
    <Suspense fallback={null}>
      <AnalyticsFiltersInner {...props} />
    </Suspense>
  );
}
