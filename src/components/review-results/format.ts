/**
 * Display formatters shared across the segmentation results modal.
 *
 * Every formatter accepts `number | null | undefined` and renders the
 * em-dash sentinel for any non-finite input. That keeps the per-cell
 * call sites short — no caller has to guard for `null` separately
 * before formatting.
 */

const EM_DASH = '—';

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return value.toFixed(fractionDigits);
}

export function formatPixels(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  if (Math.abs(value) < 10) return `${value.toFixed(1)} px`;
  return `${Math.round(value)} px`;
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return Math.round(value).toLocaleString();
}

/** Millisecond duration formatter used by the timeline panel.
 *  Switches units once values get large enough to lose meaning in ms. */
export function formatMs(value: number): string {
  if (!Number.isFinite(value)) return EM_DASH;
  if (value < 1) return '<1 ms';
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 10_000) return `${(value / 1000).toFixed(2)} s`;
  return `${(value / 1000).toFixed(1)} s`;
}
