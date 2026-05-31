"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useReducer, useState } from "react";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { strategyErrorsResponseSchema, strategyPerformanceResponseSchema } from "@/lib/api/schemas";
import { StrategyTableHeader } from "./_strategy-performance/strategy-table-header";
import { StrategyTableRow } from "./_strategy-performance/strategy-table-row";
import type { BreakdownData, SortDir, SortKey } from "./_strategy-performance/types";

interface ExpansionState {
  expandedIds: Set<string>;
  breakdowns: Record<string, BreakdownData | null>;
  loadingIds: Set<string>;
}

type ExpansionAction = { type: "toggle"; id: string } | { type: "loadStart"; id: string } | { type: "loadSuccess"; id: string; data: BreakdownData } | { type: "loadEmpty"; id: string } | { type: "loadSettled"; id: string };

const INITIAL_EXPANSION: ExpansionState = {
  expandedIds: new Set(),
  breakdowns: {},
  loadingIds: new Set()
};

function withoutId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}

function expansionReducer(state: ExpansionState, action: ExpansionAction): ExpansionState {
  switch (action.type) {
    case "loadEmpty": {
      return {
        ...state,
        breakdowns: { ...state.breakdowns, [action.id]: null },
        loadingIds: withoutId(state.loadingIds, action.id)
      };
    }
    case "loadSettled": {
      return { ...state, loadingIds: withoutId(state.loadingIds, action.id) };
    }
    case "loadStart": {
      return { ...state, loadingIds: new Set(state.loadingIds).add(action.id) };
    }
    case "loadSuccess": {
      return {
        ...state,
        breakdowns: { ...state.breakdowns, [action.id]: action.data },
        loadingIds: withoutId(state.loadingIds, action.id)
      };
    }
    case "toggle": {
      const expandedIds = new Set(state.expandedIds);
      if (expandedIds.has(action.id)) expandedIds.delete(action.id);
      else expandedIds.add(action.id);
      return { ...state, expandedIds };
    }
  }
}

export function StrategyPerformanceSection({ from, to, model, source }: { from?: string; to?: string; model?: string; source?: string }) {
  const [{ expandedIds, breakdowns, loadingIds }, dispatchExpansion] = useReducer(expansionReducer, INITIAL_EXPANSION);
  const [sortKey, setSortKey] = useState<SortKey>("generationCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: rows = [], isLoading: loading } = useQuery({
    queryKey: ["strategy-performance", from, to, model, source],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (model) params.set("model", model);
      if (source && source !== "all") params.set("source", source);
      const tz = browserTimezone();
      if (tz) params.set("tz", tz);
      const json = await fetchJson(serviceUrl(`analytics/strategy-performance?${params}`), strategyPerformanceResponseSchema, { cache: "no-store", signal });
      if (!json.data) return [];
      return Array.isArray(json.data) ? json.data : json.data.rows;
    }
  });

  const fetchBreakdown = useCallback(
    async (strategyId: string) => {
      dispatchExpansion({ type: "loadStart", id: strategyId });
      try {
        const params = new URLSearchParams({ strategy_id: strategyId });
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (model) params.set("model", model);
        if (source && source !== "all") params.set("source", source);
        const tz = browserTimezone();
        if (tz) params.set("tz", tz);
        const json = await fetchJson(serviceUrl(`analytics/strategy-errors?${params}`), strategyErrorsResponseSchema, { cache: "no-store" });
        const raw = json.data;
        if (!raw) {
          dispatchExpansion({ type: "loadEmpty", id: strategyId });
          return;
        }
        const { ratingSummary } = raw;
        const normalized: BreakdownData = {
          execution_errors: raw.executionErrors,
          scene_issues: raw.sceneIssues,
          product_issues: raw.productIssues,
          rating_summary: ratingSummary
            ? {
                total: ratingSummary.total,
                scene_good: ratingSummary.sceneGood,
                scene_failed: ratingSummary.sceneFailed,
                scene_unset: ratingSummary.sceneUnset,
                product_good: ratingSummary.productGood,
                product_failed: ratingSummary.productFailed,
                product_unset: ratingSummary.productUnset
              }
            : null
        };
        dispatchExpansion({ type: "loadSuccess", id: strategyId, data: normalized });
      } catch {
        dispatchExpansion({ type: "loadEmpty", id: strategyId });
      }
    },
    [from, model, source, to]
  );

  const toggleExpand = useCallback(
    (id: string) => {
      dispatchExpansion({ type: "toggle", id });
      if (!breakdowns[id]) void fetchBreakdown(id);
    },
    [fetchBreakdown, breakdowns]
  );

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const sortedRows = rows.toSorted((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return dir * a.name.localeCompare(b.name);
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return dir * (av - bv);
  });

  if (loading) {
    return (
      <div className="border-border bg-surface mt-8 rounded-lg border p-6 shadow-xs">
        <h2 className="text-text-primary text-h3">Strategy performance</h2>
        <p className="text-text-muted text-body mt-4">Loading…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border-border bg-surface mt-8 rounded-lg border p-6 shadow-xs">
        <h2 className="text-text-primary text-h3">Strategy performance</h2>
        <p className="text-text-secondary text-body mt-4">No strategies or runs yet.</p>
      </div>
    );
  }

  const COL_SPAN = 7;

  return (
    <div className="border-border bg-surface mt-8 rounded-lg border p-6 shadow-xs">
      <h2 className="text-text-primary text-h3">Strategy performance</h2>
      <p className="text-text-secondary text-body mt-1">Scene and product accuracy percentages per strategy. Expand a row to see evaluation issue breakdown, failure reasons, and product category rates.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="divide-border min-w-full divide-y">
          <StrategyTableHeader sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <tbody className="divide-border-subtle divide-y">
            {sortedRows.map((row) => (
              <StrategyTableRow
                key={row.id}
                row={row}
                isExpanded={expandedIds.has(row.id)}
                breakdown={breakdowns[row.id]}
                isLoadingBreakdown={loadingIds.has(row.id)}
                colSpan={COL_SPAN}
                onToggleExpand={toggleExpand}
                from={from}
                to={to}
                model={model}
                source={source}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
