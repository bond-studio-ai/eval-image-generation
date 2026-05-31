"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { type AnalyticsComparisonSlice } from "@/app/analytics/comparison-utils";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { dataRecordEnvelopeSchema } from "@/lib/api/schemas";
import { CategoryRatesTable } from "./_comparison-spreadsheet/category-rates-table";
import { formatCategoryName, normalizeCategoryRows, normalizeIssueItems, normalizeStepPerformanceRows, normalizeSummary } from "./_comparison-spreadsheet/helpers";
import { SceneIssuesTable } from "./_comparison-spreadsheet/scene-issues-table";
import { StepExecutionTimeTable } from "./_comparison-spreadsheet/step-execution-time-table";
import type { CategoryRow, SortCol, SortField } from "./_comparison-spreadsheet/types";

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
    queryKey: ["comparison", slices.map((slice) => [slice.key, slice.range.from, slice.range.to, slice.source, slice.strategyId]), model],
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

          const catJson = parseOrFallback(dataRecordEnvelopeSchema, catRes.ok ? await catRes.json() : {}, { data: null }, "comparison category rates");
          const stepJson = parseOrFallback(dataRecordEnvelopeSchema, stepRes.ok ? await stepRes.json() : {}, { data: null }, "comparison step performance");

          return {
            key: slice.key,
            data: {
              summary: normalizeSummary(catJson.data?.["summary"]),
              sceneIssues: normalizeIssueItems(catJson.data?.["sceneIssues"]),
              categories: normalizeCategoryRows(catJson.data?.["categories"]),
              steps: normalizeStepPerformanceRows(stepJson.data?.["steps"])
            }
          };
        })
      );

      return Object.fromEntries(results.map((result) => [result.key, result.data]));
    }
  });

  const sceneIssueRows = useMemo(() => {
    const issueNames = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const item of data.sceneIssues) issueNames.add(item.issue);
    }
    return Array.from(issueNames).toSorted((a, b) => a.localeCompare(b));
  }, [dataBySlice]);

  const categoryRows = useMemo<CategoryRow[]>(() => {
    const names = new Set<string>();
    for (const data of Object.values(dataBySlice)) {
      for (const cat of data.categories) names.add(cat.name);
    }

    const sortedNames = Array.from(names).toSorted((a, b) => formatCategoryName(a).localeCompare(formatCategoryName(b)));

    if (categorySort) {
      const { sliceKey, field, dir } = categorySort;
      const sliceData = dataBySlice[sliceKey];
      if (sliceData) {
        sortedNames.sort((a, b) => {
          const catA = sliceData.categories.find((category) => category.name === a);
          const catB = sliceData.categories.find((category) => category.name === b);
          const valA = catA?.[field] ?? -1;
          const valB = catB?.[field] ?? -1;
          return dir === "desc" ? valB - valA : valA - valB;
        });
      }
    }

    const sliceCategoryMaps = Object.values(dataBySlice).map((data) => new Map(data.categories.map((category) => [category.name, category])));

    return sortedNames.flatMap((catName) => {
      const issueNames = new Set<string>();
      for (const catMap of sliceCategoryMaps) {
        const cat = catMap.get(catName);
        for (const issue of cat?.issues ?? []) issueNames.add(issue.issue);
      }
      return [
        { type: "category" as const, categoryName: catName },
        ...Array.from(issueNames)
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
