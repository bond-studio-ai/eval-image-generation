"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { type AnalyticsComparisonSlice } from "@/app/analytics/comparison-utils";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { CategoryRatesTable } from "./_comparison-spreadsheet/category-rates-table";
import { formatCategoryName, normalizeCategoryRows, normalizeIssueItems, normalizeStepPerformanceRows, normalizeSummary } from "./_comparison-spreadsheet/helpers";
import { SceneIssuesTable } from "./_comparison-spreadsheet/scene-issues-table";
import { StepExecutionTimeTable } from "./_comparison-spreadsheet/step-execution-time-table";
import type { CategoryRow, SliceData, SortCol, SortField } from "./_comparison-spreadsheet/types";

export function ComparisonSpreadsheet({ slices, model }: { slices: AnalyticsComparisonSlice[]; model?: string }) {
  const [categorySort, setCategorySort] = useState<SortCol | null>(null);

  const toggleCategorySort = useCallback((sliceKey: string, field: SortField) => {
    setCategorySort((prev) => {
      if (prev?.sliceKey === sliceKey && prev.field === field) {
        if (prev.dir === "desc") return { sliceKey, field, dir: "asc" };
        return null;
      }
      return { sliceKey, field, dir: "desc" };
    });
  }, []);

  const { data: dataBySlice = {}, isLoading: loading } = useQuery({
    queryKey: ["comparison", slices.map((s) => [s.key, s.range.from, s.range.to, s.source, s.strategyId]), model],
    enabled: slices.length > 0,
    queryFn: async ({ signal }) => {
      const tz = browserTimezone();
      const results = await Promise.all(
        slices.map(async (slice) => {
          const baseParams = new URLSearchParams({
            from: slice.range.from,
            to: slice.range.to,
            source: slice.source,
            strategy_id: slice.strategyId
          });
          if (model) baseParams.set("model", model);
          if (tz) baseParams.set("tz", tz);

          const [catRes, stepRes] = await Promise.all([
            fetch(serviceUrl(`analytics/product-category-rates?${baseParams}`), {
              cache: "no-store",
              signal
            }),
            fetch(serviceUrl(`analytics/strategy-step-performance?${baseParams}`), {
              cache: "no-store",
              signal
            })
          ]);

          const catJson = catRes.ok ? await catRes.json() : {};
          const stepJson = stepRes.ok ? await stepRes.json() : {};

          return {
            key: slice.key,
            data: {
              summary: normalizeSummary(catJson.data?.summary),
              sceneIssues: normalizeIssueItems(catJson.data?.sceneIssues),
              categories: normalizeCategoryRows(catJson.data?.categories),
              steps: normalizeStepPerformanceRows(stepJson.data?.steps)
            }
          };
        })
      );

      return Object.fromEntries(results.map((r) => [r.key, r.data])) as Record<string, SliceData>;
    }
  });

  const sceneIssueRows = useMemo(() => {
    const issueNames = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const item of data.sceneIssues) issueNames.add(item.issue);
    }
    return [...issueNames].toSorted((a, b) => a.localeCompare(b));
  }, [dataBySlice]);

  const categoryRows = useMemo<CategoryRow[]>(() => {
    const names = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const cat of data.categories) names.add(cat.name);
    }

    const sortedNames = [...names].toSorted((a, b) => formatCategoryName(a).localeCompare(formatCategoryName(b)));

    if (categorySort) {
      const { sliceKey, field, dir } = categorySort;
      const sliceData = dataBySlice[sliceKey];
      if (sliceData) {
        sortedNames.sort((a, b) => {
          const catA = sliceData.categories.find((c) => c.name === a);
          const catB = sliceData.categories.find((c) => c.name === b);
          const valA = catA?.[field] ?? -1;
          const valB = catB?.[field] ?? -1;
          return dir === "desc" ? valB - valA : valA - valB;
        });
      }
    }

    const sliceCategoryMaps = Object.values(dataBySlice).map((data) => new Map(data.categories.map((c) => [c.name, c])));

    return sortedNames.flatMap((catName) => {
      const issueNames = new Set<string>();
      for (const catMap of sliceCategoryMaps) {
        const cat = catMap.get(catName);
        for (const issue of cat?.issues ?? []) issueNames.add(issue.issue);
      }
      return [
        { type: "category" as const, categoryName: catName },
        ...[...issueNames]
          .toSorted((a, b) => a.localeCompare(b))
          .map((issueName) => ({
            type: "issue" as const,
            categoryName: catName,
            issueName
          }))
      ];
    });
  }, [dataBySlice, categorySort]);

  if (slices.length === 0) {
    return (
      <div className="border-border bg-surface mt-8 rounded-lg border p-8 text-center shadow-xs">
        <p className="text-text-muted text-body">Add comparison columns above to generate the spreadsheet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <StepExecutionTimeTable slices={slices} dataBySlice={dataBySlice} loading={loading} />
      <SceneIssuesTable slices={slices} dataBySlice={dataBySlice} loading={loading} sceneIssueRows={sceneIssueRows} />
      <CategoryRatesTable slices={slices} dataBySlice={dataBySlice} loading={loading} categoryRows={categoryRows} categorySort={categorySort} toggleCategorySort={toggleCategorySort} />
    </div>
  );
}
