/**
 * Display formatters shared across the segmentation results modal.
 *
 * Every formatter accepts `number | null | undefined` and renders the
 * em-dash sentinel for any non-finite input. That keeps the per-cell
 * call sites short — no caller has to guard for `null` separately
 * before formatting.
 */

const EM_DASH = "—";
const PERCENT_SCALE = 100;
const MS_PER_SECOND = 1000;
/** Above this many ms we show one decimal; below it, two. */
const MS_COMPACT_THRESHOLD = 10_000;
const PRECISE_DECIMALS = 2;
/** Below this pixel magnitude we keep one decimal place. */
const PIXEL_DECIMAL_BELOW = 10;

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return `${(value * PERCENT_SCALE).toFixed(fractionDigits)}%`;
}

export function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  return value.toFixed(fractionDigits);
}

export function formatPixels(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EM_DASH;
  if (Math.abs(value) < PIXEL_DECIMAL_BELOW) return `${value.toFixed(1)} px`;
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
  if (value < 1) return "<1 ms";
  if (value < MS_PER_SECOND) return `${Math.round(value)} ms`;
  if (value < MS_COMPACT_THRESHOLD) return `${(value / MS_PER_SECOND).toFixed(PRECISE_DECIMALS)} s`;
  return `${(value / MS_PER_SECOND).toFixed(1)} s`;
}
