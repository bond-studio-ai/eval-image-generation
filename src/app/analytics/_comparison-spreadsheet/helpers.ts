import type { CategoryRate, IssueItem, StepPerformanceRow, SummaryData } from './types';

export const SLICE_BG_COLORS = [
  { header: 'bg-amber-50', headerBorder: 'border-amber-200' },
  { header: 'bg-blue-50', headerBorder: 'border-blue-200' },
  { header: 'bg-emerald-50', headerBorder: 'border-emerald-200' },
  { header: 'bg-violet-50', headerBorder: 'border-violet-200' },
  { header: 'bg-rose-50', headerBorder: 'border-rose-200' },
  { header: 'bg-cyan-50', headerBorder: 'border-cyan-200' },
];

export function formatCategoryName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function normalizeCategoryRows(raw: unknown): CategoryRate[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      name: typeof row.name === 'string' ? row.name : String(row.name ?? ''),
      total: Number(row.total) || 0,
      success: Number(row.success) || 0,
      failure: Number(row.failure) || 0,
      successPct: Number(row.successPct) || 0,
      failurePct: Number(row.failurePct) || 0,
      issues: Array.isArray(row.issues)
        ? row.issues.flatMap((issue) => {
            const mapped = {
              issue: String((issue as Record<string, unknown>).issue ?? ''),
              count: Number((issue as Record<string, unknown>).count ?? 0),
            };
            return mapped.issue ? [mapped] : [];
          })
        : [],
    };
  });
}

export function normalizeIssueItems(raw: unknown): IssueItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const row = entry as Record<string, unknown>;
    const mapped = {
      issue: String(row.issue ?? ''),
      count: Number(row.count ?? 0),
    };
    return mapped.issue ? [mapped] : [];
  });
}

export function normalizeStepPerformanceRows(raw: unknown): StepPerformanceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((entry) => {
      const row = entry as Record<string, unknown>;
      const numberOrNull = (v: unknown): number | null =>
        v === null || v === undefined ? null : Number(v);
      const mapped = {
        stepId: String(row.stepId ?? ''),
        stepOrder: Number(row.stepOrder ?? 0),
        name: typeof row.name === 'string' ? row.name : null,
        type: typeof row.type === 'string' ? row.type : 'generation',
        model: typeof row.model === 'string' ? row.model : null,
        sampleCount: Number(row.sampleCount ?? 0),
        avgExecTimeMs: numberOrNull(row.avgExecTimeMs),
        minExecTimeMs: numberOrNull(row.minExecTimeMs),
        maxExecTimeMs: numberOrNull(row.maxExecTimeMs),
      };
      return mapped.stepId ? [mapped] : [];
    })
    .sort((a, b) => a.stepOrder - b.stepOrder);
}

export function formatExecMs(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return '-';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}m ${remainder.toFixed(remainder < 10 ? 1 : 0)}s`;
}

export function defaultStepLabel(row: StepPerformanceRow): string {
  if (row.name && row.name.trim()) return row.name;
  if (row.type === 'judge') return 'Judge';
  return `Step ${row.stepOrder}`;
}

export function normalizeSummary(raw: unknown): SummaryData | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  return {
    sceneRatedCount: Number(s.sceneRatedCount) || 0,
    sceneGoodPct: Number(s.sceneGoodPct) || 0,
    sceneFailedPct: Number(s.sceneFailedPct) || 0,
    productRatedCount: Number(s.productRatedCount) || 0,
    productGoodPct: Number(s.productGoodPct) || 0,
    productFailedPct: Number(s.productFailedPct) || 0,
  };
}
