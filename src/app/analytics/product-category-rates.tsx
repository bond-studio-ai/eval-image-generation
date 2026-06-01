"use client";

import { useQuery } from "@tanstack/react-query";
import { sumBy } from "es-toolkit";
import { Fragment, useCallback, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { coerceString } from "@/lib/coerce-string";
import { fetchJson } from "@/lib/api/client";
import { productCategoryRatesResponseSchema } from "@/lib/api/schemas";

// Shared frozen empty set returned when the expanded state belongs to a stale
// filter combination, so the derived value keeps a stable identity.
const EMPTY_EXPANDED: ReadonlySet<string> = new Set<string>();

interface CategoryIssueCount {
  issue: string;
  count: number;
}

interface CategoryNoteCount {
  text: string;
  count: number;
}

interface CategoryRate {
  name: string;
  total: number;
  success: number;
  failure: number;
  successPct: number;
  failurePct: number;
  issues: CategoryIssueCount[];
  notes: CategoryNoteCount[];
  notesTruncated: boolean; // True when the API omitted some note buckets (e.g. cap exceeded)
}

interface RawIssueItem {
  issue?: unknown;
  count?: unknown;
}

interface RawNoteItem {
  text?: unknown;
  count?: unknown;
}

interface RawCategoryRow {
  name?: unknown;
  total?: unknown;
  success?: unknown;
  failure?: unknown;
  successPct?: unknown;
  failurePct?: unknown;
  issues?: unknown;
  notes?: unknown;
  notesTruncated?: unknown;
}

function normalizeIssueItems(raw: unknown): CategoryIssueCount[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryIssueCount[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const item = x as RawIssueItem;
    if (typeof item.issue !== "string") continue;
    const count = Number(item.count);
    if (!Number.isFinite(count)) continue;
    out.push({ issue: item.issue, count });
  }
  return out;
}

function normalizeNoteItems(raw: unknown): CategoryNoteCount[] {
  if (!Array.isArray(raw)) return [];
  const out: CategoryNoteCount[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const item = x as RawNoteItem;
    if (typeof item.text !== "string") continue;
    const count = Number(item.count);
    if (!Number.isFinite(count)) continue;
    out.push({ text: item.text, count });
  }
  return out;
}

function normalizeCategoryRows(raw: unknown): CategoryRate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = entry as RawCategoryRow;
    return {
      name: coerceString(row.name) ?? "",
      total: Number(row.total) || 0,
      success: Number(row.success) || 0,
      failure: Number(row.failure) || 0,
      successPct: Number(row.successPct) || 0,
      failurePct: Number(row.failurePct) || 0,
      issues: normalizeIssueItems(row.issues),
      notes: normalizeNoteItems(row.notes),
      notesTruncated: row.notesTruncated === true
    };
  });
}

function cn(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(" ");
}

function formatCategoryName(name: string): string {
  return name
    .replaceAll(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function ProdSortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg className={`ml-1 inline h-3 w-3 ${active ? "text-text-secondary" : "text-text-disabled"}`} viewBox="0 0 10 14" fill="currentColor">
      {dir === "asc" || !active ? <path d="M5 0L10 6H0L5 0Z" opacity={active && dir === "asc" ? 1 : 0.3} /> : null}
      {dir === "desc" || !active ? <path d="M5 14L0 8H10L5 14Z" opacity={active && dir === "desc" ? 1 : 0.3} /> : null}
    </svg>
  );
}

function FlaggedIssueInlineBar({ count, failureCount }: { count: number; failureCount: number }) {
  const pct = failureCount > 0 ? Math.min(100, (count / failureCount) * 100) : 0;
  const pctRounded = Math.round(pct);
  return (
    <div className="bg-warning-100 relative h-2 w-full min-w-0 overflow-hidden rounded-full" title={`${pctRounded}% of ${failureCount} failures`}>
      <div className="bg-warning-500 absolute inset-y-0 right-0" style={{ width: `${pct}%` }} />
    </div>
  );
}

function NoteInlineBar({ count, failureCount }: { count: number; failureCount: number }) {
  const pct = failureCount > 0 ? Math.min(100, (count / failureCount) * 100) : 0;
  const pctRounded = Math.round(pct);
  return (
    <div className="bg-border relative h-2 w-full min-w-0 overflow-hidden rounded-full" title={`${pctRounded}% of ${failureCount} failures`}>
      <div className="bg-text-muted absolute inset-y-0 right-0" style={{ width: `${pct}%` }} />
    </div>
  );
}

const PRODUCT_CATEGORY_TABLE_COL_CLASSES = [
  "w-10", // Expand (chevron)
  "", // Product category
  "w-[11rem]", // Evaluated
  "w-[11rem]", // Success
  "w-[11rem]", // Failure
  "w-60" // Rate
] as const;
const PRODUCT_CATEGORY_TABLE_COL_COUNT = PRODUCT_CATEGORY_TABLE_COL_CLASSES.length;
const PRODUCT_CATEGORY_BODY_COLSPAN = PRODUCT_CATEGORY_TABLE_COL_COUNT - 1;

const ISSUE_BREAKDOWN_TR = "!border-0";
const ISSUE_ROW_PY = "py-0.5";
const ISSUE_ROW_LAST_PY = "pt-0.5 pb-3";
const ISSUE_ROW_LAST_TD = "border-b border-border-subtle";

function CategoryIssueBreakdownRows({ items, totalEvaluated, failureCount }: { items: CategoryIssueCount[]; totalEvaluated: number; failureCount: number }) {
  if (totalEvaluated === 0) {
    return (
      <tr className={ISSUE_BREAKDOWN_TR}>
        <td className={cn("py-2 pr-0", ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
        <td colSpan={PRODUCT_CATEGORY_BODY_COLSPAN} className={cn("text-text-muted text-body py-2 pr-6", ISSUE_ROW_LAST_TD)}>
          No evaluations in this category for the selected filters.
        </td>
      </tr>
    );
  }

  if (items.length === 0) {
    return (
      <tr className={ISSUE_BREAKDOWN_TR}>
        <td className={cn("py-2 pr-0", ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
        <td colSpan={PRODUCT_CATEGORY_BODY_COLSPAN} className={cn("text-text-muted text-caption py-2 pr-6", ISSUE_ROW_LAST_TD)}>
          No individual checklist flags recorded for failing evaluations.
        </td>
      </tr>
    );
  }

  return items.map((item, index) => {
    const pctOfFailures = failureCount > 0 ? Math.round((item.count / failureCount) * 100) : 0;
    const isLast = index === items.length - 1;
    const rowPy = isLast ? ISSUE_ROW_LAST_PY : ISSUE_ROW_PY;
    return (
      <tr key={item.issue} className={ISSUE_BREAKDOWN_TR}>
        <td className={cn(rowPy, "pr-0", isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
        <td className={cn("min-w-0", rowPy, "text-text-secondary text-caption pr-4 leading-tight", isLast && ISSUE_ROW_LAST_TD)} title={item.issue}>
          <span className="block truncate">{item.issue}</span>
        </td>
        <td className={cn("px-4", rowPy, isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
        <td className={cn("px-4", rowPy, isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
        <td className={cn("px-4", rowPy, "text-warning-600 text-caption text-right leading-tight font-normal tabular-nums", isLast && ISSUE_ROW_LAST_TD)}>
          {item.count} ({pctOfFailures}%)
        </td>
        <td className={cn("px-4", rowPy, "align-middle", isLast && ISSUE_ROW_LAST_TD)}>
          <FlaggedIssueInlineBar count={item.count} failureCount={failureCount} />
        </td>
      </tr>
    );
  });
}

const NOTE_PREVIEW_CHARS = 72;

function CategoryNoteBreakdownRows({ items, failureCount, notesTruncated }: { items: CategoryNoteCount[]; failureCount: number; notesTruncated: boolean }) {
  if (failureCount <= 0 || items.length === 0) return null;

  const notesTotalCount = sumBy(items, (x) => x.count);

  const headerRow = (
    <tr className={ISSUE_BREAKDOWN_TR}>
      <td className="border-border-subtle border-t pt-3 pr-0 pb-1" aria-hidden tabIndex={-1} />
      <td colSpan={PRODUCT_CATEGORY_BODY_COLSPAN} className="border-border-subtle text-text-muted text-caption border-t pt-3 pr-6 pb-1 font-medium tracking-wider uppercase">
        Freeform notes ({notesTotalCount})
      </td>
    </tr>
  );

  return (
    <>
      {headerRow}
      {items.map((item, index) => {
        const pctOfFailures = failureCount > 0 ? Math.round((item.count / failureCount) * 100) : 0;
        const isLast = index === items.length - 1 && !notesTruncated;
        const rowPy = isLast ? ISSUE_ROW_LAST_PY : ISSUE_ROW_PY;
        const preview = item.text.length > NOTE_PREVIEW_CHARS ? `${item.text.slice(0, NOTE_PREVIEW_CHARS)}…` : item.text;
        return (
          // eslint-disable-next-line react/no-array-index-key -- stateless display rows over a derived array whose note text can repeat; never reordered
          <tr key={`note-${index}-${item.text}`} className={ISSUE_BREAKDOWN_TR}>
            <td className={cn(rowPy, "pr-0", isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
            <td className={cn("min-w-0", rowPy, "text-text-secondary text-caption pr-4 leading-tight", isLast && ISSUE_ROW_LAST_TD)} title={item.text}>
              <span className="block truncate">{preview}</span>
            </td>
            <td className={cn("px-4", rowPy, isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
            <td className={cn("px-4", rowPy, isLast && ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
            <td className={cn("px-4", rowPy, "text-text-secondary text-caption text-right leading-tight font-normal tabular-nums", isLast && ISSUE_ROW_LAST_TD)}>
              {item.count} ({pctOfFailures}%)
            </td>
            <td className={cn("px-4", rowPy, "align-middle", isLast && ISSUE_ROW_LAST_TD)}>
              <NoteInlineBar count={item.count} failureCount={failureCount} />
            </td>
          </tr>
        );
      })}
      {notesTruncated ? (
        <tr className={ISSUE_BREAKDOWN_TR}>
          <td className={cn(ISSUE_ROW_LAST_PY, "border-t-0 pr-0", ISSUE_ROW_LAST_TD)} aria-hidden tabIndex={-1} />
          <td colSpan={PRODUCT_CATEGORY_BODY_COLSPAN} className={cn(ISSUE_ROW_LAST_PY, ISSUE_ROW_LAST_TD, "text-text-muted text-caption border-t-0 pr-6")}>
            … and several more.
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function ProductCategoryRates({ from, to, model, source, strategyId, compact }: { from?: string; to?: string; model?: string; source?: string; strategyId?: string; compact?: boolean }) {
  type ProdSortKey = "name" | "total" | "successPct" | "failurePct";
  type ProdSortDir = "asc" | "desc";

  const [sortKey, setSortKey] = useState<ProdSortKey>("total");
  const [sortDir, setSortDir] = useState<ProdSortDir>("desc");

  // Tie the expanded set to the filter inputs that produced it. When any
  // filter changes the stored key falls stale, so `expandedIds` derives
  // back to empty during render — no effect needed to collapse rows.
  const filterKey = `${from ?? ""}|${to ?? ""}|${model ?? ""}|${source ?? ""}|${strategyId ?? ""}`;
  const [expanded, setExpanded] = useState<{ key: string; ids: Set<string> }>(() => ({
    key: filterKey,
    ids: new Set()
  }));
  const expandedIds = expanded.key === filterKey ? expanded.ids : EMPTY_EXPANDED;

  const toggleSort = useCallback((key: ProdSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const toggleExpand = useCallback(
    (categoryKey: string) => {
      setExpanded((prev) => {
        const next = new Set(prev.key === filterKey ? prev.ids : []);
        if (next.has(categoryKey)) next.delete(categoryKey);
        else next.add(categoryKey);
        return { key: filterKey, ids: next };
      });
    },
    [filterKey]
  );

  const { data: categories = [], isLoading: loading } = useQuery({
    queryKey: ["product-category-rates", from, to, model, source, strategyId],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (model) params.set("model", model);
      if (source && source !== "all") params.set("source", source);
      if (strategyId) params.set("strategy_id", strategyId);
      const tz = browserTimezone();
      if (tz) params.set("tz", tz);
      const json = await fetchJson(serviceUrl(`analytics/product-category-rates?${params}`), productCategoryRatesResponseSchema, { cache: "no-store", signal });
      return normalizeCategoryRows(json.data?.categories);
    }
  });

  if (loading) {
    return <p className="text-text-muted text-body">Loading product rates…</p>;
  }

  if (categories.length === 0) {
    return <p className="text-text-muted text-body">No product evaluation data available.</p>;
  }

  const sortedCompact = categories.toSorted((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return dir * formatCategoryName(a.name).localeCompare(formatCategoryName(b.name));
    return dir * (a[sortKey] - b[sortKey]);
  });

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <p className="text-text-muted text-caption font-medium tracking-wider uppercase">Product category rates</p>
          <div className="flex gap-1">
            {[
              { key: "name" as ProdSortKey, label: "Name" },
              { key: "total" as ProdSortKey, label: "Count" },
              { key: "successPct" as ProdSortKey, label: "Success" },
              { key: "failurePct" as ProdSortKey, label: "Failure" }
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  toggleSort(key);
                }}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${sortKey === key ? "text-text-secondary bg-border" : "text-text-disabled hover:text-text-secondary"}`}
              >
                {label}
                <ProdSortIcon active={sortKey === key} dir={sortDir} />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {sortedCompact.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2">
              <span className="text-text-secondary text-caption w-28 truncate" title={formatCategoryName(cat.name)}>
                {formatCategoryName(cat.name)}
              </span>
              <div className="bg-surface-sunken flex h-4 flex-1 overflow-hidden rounded-full">
                {cat.success > 0 && (
                  <div className="bg-success-500 text-text-inverse flex items-center justify-center text-[9px] font-medium" style={{ width: `${cat.successPct}%` }} title={`Success: ${cat.success}`}>
                    {cat.successPct >= 15 ? `${cat.successPct}%` : ""}
                  </div>
                )}
                {cat.failure > 0 && (
                  <div className="bg-warning-500 text-text-inverse flex items-center justify-center text-[9px] font-medium" style={{ width: `${cat.failurePct}%` }} title={`Failure: ${cat.failure}`}>
                    {cat.failurePct >= 15 ? `${cat.failurePct}%` : ""}
                  </div>
                )}
              </div>
              <span className="text-text-muted w-8 text-right text-[10px]">{cat.total}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sorted = categories.toSorted((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return dir * formatCategoryName(a.name).localeCompare(formatCategoryName(b.name));
    return dir * (a[sortKey] - b[sortKey]);
  });

  const thBase = "px-4 py-2 text-right text-caption font-medium uppercase tracking-wider text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors";

  return (
    <div className="overflow-x-auto">
      <table className="divide-border min-w-full table-fixed divide-y">
        <colgroup>
          {PRODUCT_CATEGORY_TABLE_COL_CLASSES.map((colClass, i) => (
            // eslint-disable-next-line react/no-array-index-key -- static <colgroup> definition, fixed length, never reordered
            <col key={i} className={colClass || undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="w-10 py-2 pr-0" aria-hidden tabIndex={-1} />
            <th
              className="text-text-secondary hover:text-text-primary text-caption cursor-pointer py-2 pr-4 text-left font-medium tracking-wider uppercase transition-colors select-none"
              onClick={() => {
                toggleSort("name");
              }}
            >
              Product Category
              <ProdSortIcon active={sortKey === "name"} dir={sortDir} />
            </th>
            <th
              className={thBase}
              onClick={() => {
                toggleSort("total");
              }}
            >
              Evaluated
              <ProdSortIcon active={sortKey === "total"} dir={sortDir} />
            </th>
            <th
              className={thBase}
              onClick={() => {
                toggleSort("successPct");
              }}
            >
              Success
              <ProdSortIcon active={sortKey === "successPct"} dir={sortDir} />
            </th>
            <th
              className={thBase}
              onClick={() => {
                toggleSort("failurePct");
              }}
            >
              Failure
              <ProdSortIcon active={sortKey === "failurePct"} dir={sortDir} />
            </th>
            <th className="text-text-secondary text-caption w-60 px-4 py-2 text-left font-medium tracking-wider uppercase">Rate</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cat) => {
            const isExpanded = expandedIds.has(cat.name);
            return (
              <Fragment key={cat.name}>
                <tr className="border-border-subtle hover:bg-surface-muted/50 border-t">
                  <td className="py-2 pr-0">
                    <button
                      type="button"
                      onClick={() => {
                        toggleExpand(cat.name);
                      }}
                      className="text-text-muted hover:text-text-secondary hover:bg-border rounded p-1"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Collapse breakdown" : "Expand breakdown"}
                    >
                      <ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                  </td>
                  <td className="text-text-primary text-body py-2 pr-4 font-medium">{formatCategoryName(cat.name)}</td>
                  <td className="text-text-secondary text-body px-4 py-2 text-right">{cat.total}</td>
                  <td className="text-success-600 text-body px-4 py-2 text-right">
                    {cat.success} ({cat.successPct}%)
                  </td>
                  <td className="text-warning-600 text-body px-4 py-2 text-right">
                    {cat.failure} ({cat.failurePct}%)
                  </td>
                  <td className="px-4 py-2">
                    <div className="bg-surface-sunken flex h-5 w-full overflow-hidden rounded-full">
                      {cat.success > 0 && (
                        <div className="bg-success-500 text-text-inverse flex items-center justify-center text-[10px] font-medium" style={{ width: `${cat.successPct}%` }}>
                          {cat.successPct >= 12 ? `${cat.successPct}%` : ""}
                        </div>
                      )}
                      {cat.failure > 0 && (
                        <div className="bg-warning-500 text-text-inverse flex items-center justify-center text-[10px] font-medium" style={{ width: `${cat.failurePct}%` }}>
                          {cat.failurePct >= 12 ? `${cat.failurePct}%` : ""}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <>
                    <CategoryIssueBreakdownRows items={cat.issues} totalEvaluated={cat.total} failureCount={cat.failure} />
                    <CategoryNoteBreakdownRows items={cat.notes} failureCount={cat.failure} notesTruncated={cat.notesTruncated} />
                  </>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
