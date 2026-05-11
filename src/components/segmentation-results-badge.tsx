'use client';

import type { SegmentationState } from '@/components/segmentation-badge';
import { serviceUrl } from '@/lib/api-base';
import { useEffect, useMemo, useState } from 'react';

/**
 * Hex color the backend tints each category with on the combined overlay.
 * MUST stay in sync with `DEFAULT_SEGMENTATION_COLORS` in
 * `service-image-generation/src/services/segmentation-overlay-colors.ts`.
 *
 * Two categories that collapse to the same SAM prompt intentionally share
 * a hex (`floor_tiles` + `lvps` → `Floor`; `wall_tiles` + `paints` → `Wall`;
 * `tub_doors` + `shower_glasses` → `Shower Glass`).
 */
const SEGMENTATION_COLORS: Record<string, string> = {
  vanities: '#E6194B',
  faucets: '#3CB44B',
  lightings: '#FFE119',
  mirrors: '#4363D8',
  shower_systems: '#F58231',
  floor_tiles: '#911EB4',
  lvps: '#911EB4',
  wall_tiles: '#46F0F0',
  tubs: '#F032E6',
  tub_fillers: '#BCF60C',
  tub_doors: '#FABEBE',
  shower_glasses: '#FABEBE',
  shower_wall_tiles: '#008080',
  shower_floor_tiles: '#E6BEFF',
  shower_curb_tiles: '#9A6324',
  toilets: '#FFFAC8',
  paints: '#46F0F0',
  wallpapers: '#800000',
  shelves: '#AAFFC3',
  toilet_paper_holders: '#808000',
  towel_bars: '#FFD8B1',
  robe_hooks: '#000075',
  towel_rings: '#A9A9A9',
};

function colorForCategory(category: string): string {
  return SEGMENTATION_COLORS[category] ?? '#9CA3AF';
}

/**
 * Shape returned by `GET /image-generation/v1/generations/:id/segmentation`.
 * Mirrors `Segmentation` in
 * `src/app/strategies/[id]/runs/[runId]/run-detail.tsx` so the modal
 * shows the same payload shape the run-detail page already understands.
 */
interface SegmentationCategoryResponse {
  image?: string | null;
  masks?: string[];
  scores?: number[];
  boxes?: unknown;
  metadata?: Record<string, unknown> | null;
}

/**
 * Per-step wall-clock breakdown the backend records on every fresh run
 * and persists in `generation_segmentation.timings`. Keys come back in
 * camelCase because the case-converter middleware re-cases JSONB keys
 * on response. `null` for older rows (predates the column) or for the
 * cached short-circuit path that doesn't re-time anything.
 */
interface SegmentationTimingStep {
  name: string;
  /** Offset from `startedAt` in ms. */
  startMs: number;
  durationMs: number;
  metadata?: Record<string, unknown> | null;
}

interface SegmentationTimings {
  totalMs: number;
  startedAt: string;
  endedAt: string;
  steps: SegmentationTimingStep[];
}

interface SegmentationRecord {
  generationResultId?: string;
  createdAt?: string;
  /**
   * URL of the merged PNG with every category's masks tinted in their
   * configured color and composited over the original output image.
   * Server-side column is `combined_overlay_url`; the proxy converts to
   * camelCase. NULL means no overlay was produced (older row, no masks,
   * or transient sharp/S3 failure).
   */
  combinedOverlayUrl?: string | null;
  /** Persisted execution timeline for the run that produced this row. */
  timings?: SegmentationTimings | null;
  results?: Record<string, SegmentationCategoryResponse | null | undefined> | null;
}

interface SegmentationResultsBadgeProps {
  generationId: string | null | undefined;
  /** Same per-id state the inline `SegmentationBadge` shows; the dot
   * only appears when this is `done`, so the icon doesn't compete with
   * the inline run/check spinner under the preset name. */
  state: SegmentationState | undefined;
}

const CATEGORY_LABELS: Record<string, string> = {
  vanities: 'Vanity',
  faucets: 'Faucet',
  lightings: 'Lighting',
  mirrors: 'Mirror',
  shower_systems: 'Shower system',
  floor_tiles: 'Floor tile',
  lvps: 'LVP',
  wall_tiles: 'Wall tile',
  tubs: 'Tub',
  tub_fillers: 'Tub filler',
  tub_doors: 'Tub door',
  shower_glasses: 'Shower glass',
  shower_wall_tiles: 'Shower wall tile',
  shower_floor_tiles: 'Shower floor tile',
  shower_curb_tiles: 'Shower curb tile',
  toilets: 'Toilet',
  paints: 'Paint',
  wallpapers: 'Wallpaper',
  shelves: 'Shelves',
  toilet_paper_holders: 'Toilet paper holder',
  towel_bars: 'Towel bar',
  robe_hooks: 'Robe hook',
  towel_rings: 'Towel ring',
  ceilings: 'Ceiling',
};

function categoryLabel(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface CategoryRow {
  category: string;
  label: string;
  composite: string | null;
  maskCount: number;
  topScore: number | null;
}

function buildRows(record: SegmentationRecord | null): CategoryRow[] {
  const results = record?.results;
  if (!results || typeof results !== 'object' || Array.isArray(results)) return [];
  return Object.entries(results)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([category, value]) => {
      const data = (value ?? {}) as SegmentationCategoryResponse;
      const masks = Array.isArray(data.masks) ? data.masks : [];
      const scores = Array.isArray(data.scores) ? data.scores : [];
      const numericScores = scores.filter((s): s is number => typeof s === 'number');
      const composite = typeof data.image === 'string' && data.image.length > 0 ? data.image : null;
      return {
        category,
        label: categoryLabel(category),
        composite,
        maskCount: masks.length,
        topScore: numericScores.length > 0 ? Math.max(...numericScores) : null,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function SegmentationResultsBadge({ generationId, state }: SegmentationResultsBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [record, setRecord] = useState<SegmentationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !!generationId && state?.kind === 'done';

  useEffect(() => {
    if (!showModal) return;
    if (!generationId) return;
    if (record) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(serviceUrl(`generations/${generationId}/segmentation`), {
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load segmentation (${res.status})`);
          return;
        }
        const json = (await res.json()) as { data?: { record?: SegmentationRecord } } | null;
        const next = json?.data?.record ?? null;
        if (!cancelled) setRecord(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showModal, generationId, record]);

  // When the user re-runs segmentation, drop the previously-cached record so
  // the next modal open re-fetches the fresh payload. We key off the state
  // reference: each transition out of `done` (running → done after a force
  // re-run) gets a brand-new state object from the hook.
  useEffect(() => {
    if (state?.kind !== 'done') {
      setRecord(null);
    }
  }, [state]);

  if (!ready) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowModal(true);
        }}
        title="View segmentation masks"
        className="absolute top-1 right-1 z-10 inline-flex items-center gap-0.5 rounded-full bg-purple-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm transition-colors hover:bg-purple-500"
      >
        <MaskIcon className="h-2.5 w-2.5" />
        Masks
      </button>
      {showModal && (
        <SegmentationModal
          generationId={generationId!}
          record={record}
          loading={loading}
          error={error}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function SegmentationModal({
  generationId,
  record,
  loading,
  error,
  onClose,
}: {
  generationId: string;
  record: SegmentationRecord | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const rows = useMemo(() => buildRows(record), [record]);
  const totalMasks = rows.reduce((sum, row) => sum + row.maskCount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Segmentation masks</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {rows.length > 0
                ? `${rows.length} ${rows.length === 1 ? 'category' : 'categories'} · ${totalMasks} ${totalMasks === 1 ? 'mask' : 'masks'}`
                : loading
                  ? 'Loading…'
                  : 'No categories'}
              {record?.createdAt && (
                <>
                  {' · '}
                  {new Date(record.createdAt).toLocaleString()}
                </>
              )}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-400">
              gen {generationId.slice(0, 8)}…
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Loading segmentation…
            </div>
          )}
          {error && !loading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && record?.timings && (
            <SegmentationTimelineSection timings={record.timings} />
          )}
          {!loading && !error && record?.combinedOverlayUrl && (
            <div className="mb-5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <h4 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
                  Combined overlay
                </h4>
                <a
                  href={record.combinedOverlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-700 hover:text-purple-900 hover:underline"
                >
                  Open full image
                </a>
              </div>
              <a
                href={record.combinedOverlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50"
              >
                <SkeletonImage
                  src={record.combinedOverlayUrl}
                  alt="Combined segmentation overlay (all categories tinted)"
                  containerClassName="aspect-[4/3] max-h-[480px] w-full"
                  imgClassName="block h-full w-full object-contain"
                />
              </a>
              {rows.length > 0 && <SegmentationLegend rows={rows} />}
            </div>
          )}
          {!loading && !error && rows.length === 0 && !record?.combinedOverlayUrl && (
            <p className="py-12 text-center text-sm text-gray-500">
              No segmentation results to display.
            </p>
          )}
          {!loading && !error && rows.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {rows.map((row) => (
                <div
                  key={row.category}
                  className="rounded-md border border-gray-200 bg-gray-50 p-2"
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <p
                      className="truncate text-[11px] font-semibold text-gray-700"
                      title={row.label}
                    >
                      {row.label}
                    </p>
                    {row.topScore !== null && (
                      <span className="shrink-0 rounded bg-white px-1 py-px text-[10px] text-gray-600 tabular-nums ring-1 ring-gray-200">
                        {row.topScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {row.maskCount} {row.maskCount === 1 ? 'mask' : 'masks'}
                  </p>
                  {row.composite ? (
                    <a
                      href={row.composite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative mt-2 block aspect-square w-full overflow-hidden rounded border border-gray-200 bg-white"
                    >
                      <SkeletonImage
                        src={row.composite}
                        alt={`${row.label} segmentation overlay`}
                        containerClassName="h-full w-full"
                        imgClassName="h-full w-full object-contain"
                      />
                    </a>
                  ) : (
                    <div className="mt-2 flex aspect-square w-full items-center justify-center rounded border border-dashed border-gray-200 bg-white">
                      <p className="px-2 text-center text-[10px] text-gray-400 italic">
                        {row.maskCount === 0 ? 'No masks detected' : 'No overlay returned'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Plain `<img>` with a pulsing gray skeleton that fills the container until
 * the network image actually loads. The S3 overlays can take a couple of
 * seconds to fetch, especially for large composites, and showing nothing
 * during that window made the modal feel broken.
 *
 * `containerClassName` controls the box (and therefore the skeleton's size
 * — typically an `aspect-*` utility); `imgClassName` controls how the
 * loaded image fits inside.
 */
function SkeletonImage({
  src,
  alt,
  containerClassName,
  imgClassName,
}: {
  src: string;
  alt: string;
  containerClassName: string;
  imgClassName: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset when the URL changes (e.g. after a force re-run swaps the
  // overlay PNG) so we don't briefly show the old image while the new
  // one decodes.
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  return (
    <div className={`relative ${containerClassName}`}>
      {!loaded && !errored && (
        <div
          className="absolute inset-0 animate-pulse rounded bg-gray-200"
          aria-hidden="true"
        />
      )}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center rounded bg-gray-100 px-2 text-center text-[11px] text-gray-500">
          Failed to load image
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`${imgClassName} transition-opacity duration-150 ${loaded && !errored ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}

/**
 * Color → category swatch grid rendered under the combined overlay so the
 * viewer can map each tinted region back to a product type. Uses the
 * categories actually present on the segmentation record (sorted by label
 * to match the per-category grid below).
 */
function SegmentationLegend({ rows }: { rows: CategoryRow[] }) {
  return (
    <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
        Legend
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {rows.map((row) => (
          <div key={row.category} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-gray-300"
              style={{ backgroundColor: colorForCategory(row.category) }}
              aria-hidden="true"
            />
            <span
              className="text-[11px] leading-tight text-gray-700"
              title={`${row.label} · ${row.maskCount} ${row.maskCount === 1 ? 'mask' : 'masks'}`}
            >
              {row.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stable display labels for the step names emitted by the backend
 * (see `SegmentationTimingStep` in `segmentation.service.ts`). We
 * fall back to the raw key for forward compatibility — adding a new
 * step on the backend doesn't require a frontend change.
 */
const TIMELINE_STEP_LABELS: Record<string, string> = {
  lookup_result_id: 'Find result row',
  lookup_existing_segmentation: 'Check cached row',
  lookup_result_row: 'Load output URL',
  lookup_input_row: 'Load input categories',
  build_prompts: 'Build SAM prompts',
  delete_existing: 'Clear stale row',
  sam_fanout: 'SAM fan-out',
  overlay_build: 'Build combined overlay',
  overlay_upload: 'Upload overlay to S3',
  persist: 'Persist to DB',
};

/**
 * Soft pastel per-step color so the Gantt-style bars are visually
 * distinct without making each step look like an alert. Steps not in
 * this map get a neutral gray.
 */
const TIMELINE_STEP_COLORS: Record<string, string> = {
  lookup_result_id: 'bg-slate-300',
  lookup_existing_segmentation: 'bg-slate-300',
  lookup_result_row: 'bg-slate-300',
  lookup_input_row: 'bg-slate-300',
  build_prompts: 'bg-slate-300',
  delete_existing: 'bg-amber-300',
  sam_fanout: 'bg-purple-400',
  overlay_build: 'bg-blue-400',
  overlay_upload: 'bg-emerald-400',
  persist: 'bg-slate-400',
};

function timelineStepLabel(name: string): string {
  return TIMELINE_STEP_LABELS[name] ?? name.replace(/_/g, ' ');
}

function timelineStepColor(name: string): string {
  return TIMELINE_STEP_COLORS[name] ?? 'bg-gray-400';
}

function formatMs(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value < 1) return '<1 ms';
  if (value < 1000) return `${Math.round(value)} ms`;
  if (value < 10_000) return `${(value / 1000).toFixed(2)} s`;
  return `${(value / 1000).toFixed(1)} s`;
}

interface PerCategoryTiming {
  category: string;
  prompt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

function readPerCategoryTimings(metadata: Record<string, unknown> | null | undefined): PerCategoryTiming[] {
  if (!metadata) return [];
  const raw = metadata['perCategory'];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry): PerCategoryTiming | null => {
      if (!entry || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const category = typeof obj['category'] === 'string' ? obj['category'] : null;
      const prompt = typeof obj['prompt'] === 'string' ? obj['prompt'] : '';
      const durationMs = typeof obj['durationMs'] === 'number' ? obj['durationMs'] : 0;
      const ok = obj['ok'] === true;
      const error = typeof obj['error'] === 'string' ? obj['error'] : undefined;
      if (!category) return null;
      return { category, prompt, durationMs, ok, ...(error ? { error } : {}) };
    })
    .filter((entry): entry is PerCategoryTiming => entry !== null)
    .sort((a, b) => b.durationMs - a.durationMs);
}

/**
 * Gantt-style execution timeline for a single segmentation run. Each step
 * is rendered as a horizontal bar positioned at `startMs / totalMs` with
 * width `durationMs / totalMs`, so the viewer can spot where the run
 * actually spent time (typically SAM fan-out + overlay upload).
 *
 * Below the bars we surface the per-category SAM durations from
 * `sam_fanout.metadata.perCategory` because that's the bit that varies
 * the most between runs and the timeline-bar level resolution would
 * otherwise hide it.
 */
function SegmentationTimelineSection({ timings }: { timings: SegmentationTimings }) {
  // The backend uses a monotonic clock for offsets, but a near-zero or
  // missing total can still slip through (e.g. an aborted run). Default
  // to the max(end of last step) so we never divide by zero in the
  // bar-width math.
  const inferredTotal = Math.max(
    timings.totalMs,
    ...timings.steps.map((step) => step.startMs + step.durationMs),
    1,
  );

  const samStep = timings.steps.find((step) => step.name === 'sam_fanout');
  const perCategoryRows = readPerCategoryTimings(samStep?.metadata);

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h4 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
          Execution timeline
        </h4>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {formatMs(timings.totalMs)} total
        </span>
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          {timings.steps.map((step, idx) => {
            const widthPct = Math.max((step.durationMs / inferredTotal) * 100, 0.5);
            const leftPct = Math.min((step.startMs / inferredTotal) * 100, 99.5);
            const sharePct = (step.durationMs / inferredTotal) * 100;
            return (
              <div key={`${step.name}-${idx}`} className="flex items-center gap-2 text-[11px] text-gray-700">
                <span
                  className="w-36 shrink-0 truncate"
                  title={timelineStepLabel(step.name)}
                >
                  {timelineStepLabel(step.name)}
                </span>
                <div className="relative h-3 flex-1 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                  <div
                    className={`absolute top-0 bottom-0 ${timelineStepColor(step.name)}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Started at ${formatMs(step.startMs)}, took ${formatMs(step.durationMs)} (${sharePct.toFixed(1)}%)`}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-gray-600">
                  {formatMs(step.durationMs)}
                </span>
              </div>
            );
          })}
        </div>
        {perCategoryRows.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-2">
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              SAM per category
            </p>
            <div className="flex flex-col gap-1">
              {perCategoryRows.map((row) => (
                <div
                  key={row.category}
                  className="flex items-center gap-2 text-[11px] text-gray-700"
                >
                  <span className="w-36 shrink-0 truncate" title={`${categoryLabel(row.category)} — ${row.prompt}`}>
                    {categoryLabel(row.category)}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                    <div
                      className={`absolute inset-y-0 left-0 ${row.ok ? 'bg-purple-300' : 'bg-rose-300'}`}
                      style={{
                        width: `${Math.max(
                          (row.durationMs / Math.max(samStep?.durationMs ?? row.durationMs, 1)) * 100,
                          1,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-gray-600">
                    {formatMs(row.durationMs)}
                  </span>
                  {!row.ok && (
                    <span
                      className="shrink-0 rounded bg-rose-50 px-1 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200"
                      title={row.error}
                    >
                      failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}
