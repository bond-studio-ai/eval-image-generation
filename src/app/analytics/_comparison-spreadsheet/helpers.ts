import { coerceString } from "@/lib/coerce-string";
import type { CategoryRate, IssueItem, StepPerformanceRow, SummaryData } from "./types";

export const SLICE_BG_COLORS = [
  { header: "bg-warning-50", headerBorder: "border-warning-200" },
  { header: "bg-primary-50", headerBorder: "border-primary-200" },
  { header: "bg-success-50", headerBorder: "border-success-200" },
  { header: "bg-accent-50", headerBorder: "border-accent-200" },
  { header: "bg-danger-50", headerBorder: "border-danger-200" },
  { header: "bg-info-50", headerBorder: "border-info-200" }
];

export function formatCategoryName(name: string): string {
  return name
    .replaceAll(/([A-Z])/g, " $1")
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

interface RawCategoryRow {
  name?: unknown;
  total?: unknown;
  success?: unknown;
  failure?: unknown;
  successPct?: unknown;
  failurePct?: unknown;
  issues?: unknown;
}

interface RawIssueItem {
  issue?: unknown;
  count?: unknown;
}

export function normalizeCategoryRows(raw: unknown): CategoryRate[] {
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
      issues: Array.isArray(row.issues)
        ? row.issues.flatMap((issue) => {
            const rawIssue = issue as RawIssueItem;
            const mapped = {
              issue: coerceString(rawIssue.issue) ?? "",
              count: Number(rawIssue.count ?? 0)
            };
            return mapped.issue ? [mapped] : [];
          })
        : []
    };
  });
}

export function normalizeIssueItems(raw: unknown): IssueItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const row = entry as RawIssueItem;
    const mapped = {
      issue: coerceString(row.issue) ?? "",
      count: Number(row.count ?? 0)
    };
    return mapped.issue ? [mapped] : [];
  });
}

interface RawStepPerformanceRow {
  stepId?: unknown;
  stepOrder?: unknown;
  name?: unknown;
  type?: unknown;
  model?: unknown;
  sampleCount?: unknown;
  avgExecTimeMs?: unknown;
  minExecTimeMs?: unknown;
  maxExecTimeMs?: unknown;
}

export function normalizeStepPerformanceRows(raw: unknown): StepPerformanceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((entry) => {
      const row = entry as RawStepPerformanceRow;
      const numberOrNull = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));
      const mapped = {
        stepId: coerceString(row.stepId) ?? "",
        stepOrder: Number(row.stepOrder ?? 0),
        name: typeof row.name === "string" ? row.name : null,
        type: typeof row.type === "string" ? row.type : "generation",
        model: typeof row.model === "string" ? row.model : null,
        sampleCount: Number(row.sampleCount ?? 0),
        avgExecTimeMs: numberOrNull(row.avgExecTimeMs),
        minExecTimeMs: numberOrNull(row.minExecTimeMs),
        maxExecTimeMs: numberOrNull(row.maxExecTimeMs)
      };
      return mapped.stepId ? [mapped] : [];
    })
    .sort((a, b) => a.stepOrder - b.stepOrder);
}

export function formatExecMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "-";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}m ${remainder.toFixed(remainder < 10 ? 1 : 0)}s`;
}

export function defaultStepLabel(row: StepPerformanceRow): string {
  if (row.name && row.name.trim()) return row.name;
  if (row.type === "judge") return "Judge";
  return `Step ${row.stepOrder}`;
}

interface RawSummary {
  sceneRatedCount?: unknown;
  sceneGoodPct?: unknown;
  sceneFailedPct?: unknown;
  productRatedCount?: unknown;
  productGoodPct?: unknown;
  productFailedPct?: unknown;
}

export function normalizeSummary(raw: unknown): SummaryData | null {
  if (!raw || typeof raw !== "object") return null;
  const summary = raw as RawSummary;
  return {
    sceneRatedCount: Number(summary.sceneRatedCount) || 0,
    sceneGoodPct: Number(summary.sceneGoodPct) || 0,
    sceneFailedPct: Number(summary.sceneFailedPct) || 0,
    productRatedCount: Number(summary.productRatedCount) || 0,
    productGoodPct: Number(summary.productGoodPct) || 0,
    productFailedPct: Number(summary.productFailedPct) || 0
  };
}
