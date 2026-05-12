'use client';

import type { SegmentationState } from '@/components/segmentation-badge';
import { serviceUrl } from '@/lib/api-base';
import {
  getSegmentationCategories,
  indexByKey,
  type SegmentationCategoryMetadata,
} from '@/lib/segmentation-categories';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Fallback hex palette used when the `/segmentation-categories` endpoint
 * hasn't responded yet (or has failed). The authoritative palette comes
 * from the backend — see `DEFAULT_SEGMENTATION_COLORS` in
 * `service-image-generation/src/domain/segmentation/overlay-colors.ts`.
 * Keys are registered in BOTH snake_case and camelCase because
 * `record.results` from the segmentation endpoint uses camelCase keys
 * (the case-converter middleware rewrites all JSON object keys on the
 * way out), which is what tripped the legend before this endpoint
 * existed — multi-word categories silently fell through to the default
 * gray.
 */
const FALLBACK_COLORS: Record<string, string> = {
  vanities: '#E6194B',
  faucets: '#3CB44B',
  lightings: '#FFE119',
  mirrors: '#4363D8',
  shower_systems: '#F58231',
  showerSystems: '#F58231',
  floor_tiles: '#911EB4',
  floorTiles: '#911EB4',
  lvps: '#911EB4',
  wall_tiles: '#46F0F0',
  wallTiles: '#46F0F0',
  tubs: '#F032E6',
  tub_fillers: '#BCF60C',
  tubFillers: '#BCF60C',
  tub_doors: '#FABEBE',
  tubDoors: '#FABEBE',
  shower_glasses: '#FABEBE',
  showerGlasses: '#FABEBE',
  shower_wall_tiles: '#008080',
  showerWallTiles: '#008080',
  shower_floor_tiles: '#E6BEFF',
  showerFloorTiles: '#E6BEFF',
  shower_curb_tiles: '#9A6324',
  showerCurbTiles: '#9A6324',
  toilets: '#FFFAC8',
  paints: '#46F0F0',
  wallpapers: '#800000',
  shelves: '#AAFFC3',
  toilet_paper_holders: '#808000',
  toiletPaperHolders: '#808000',
  towel_bars: '#FFD8B1',
  towelBars: '#FFD8B1',
  robe_hooks: '#000075',
  robeHooks: '#000075',
  towel_rings: '#A9A9A9',
  towelRings: '#A9A9A9',
  toilet_flush: '#FFFAC8',
  toiletFlush: '#FFFAC8',
  vanity_backsplash: '#E6194B',
  vanityBacksplash: '#E6194B',
  shower_handle: '#F58231',
  showerHandle: '#F58231',
  shower_spout: '#F58231',
  showerSpout: '#F58231',
};

const NEUTRAL_SWATCH = '#9CA3AF';

interface CategoryLookup {
  color: (category: string) => string;
  label: (category: string) => string;
}

function fallbackLabel(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a `(category) -> { color, label }` lookup from the categories
 * fetched from the backend, falling back to a baked-in palette while the
 * fetch is in flight or after it has failed. Callers should pass the
 * categories returned by `useSegmentationCategories()`.
 */
function buildCategoryLookup(entries: SegmentationCategoryMetadata[] | null): CategoryLookup {
  if (!entries) {
    return {
      color: (category) => FALLBACK_COLORS[category] ?? NEUTRAL_SWATCH,
      label: fallbackLabel,
    };
  }
  const indexed = indexByKey(entries);
  return {
    color: (category) =>
      indexed.get(category)?.color ?? FALLBACK_COLORS[category] ?? NEUTRAL_SWATCH,
    label: (category) => indexed.get(category)?.label ?? fallbackLabel(category),
  };
}

/**
 * React hook wrapping the module-level cached fetch in
 * `getSegmentationCategories`. Returns `null` until the response lands
 * (caller falls back to the baked-in palette in the meantime). Errors
 * are intentionally swallowed — the fallback palette covers them and we
 * don't want a transient backend outage to break the modal.
 */
function useSegmentationCategories(): SegmentationCategoryMetadata[] | null {
  const [entries, setEntries] = useState<SegmentationCategoryMetadata[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSegmentationCategories()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        /* swallowed: fallback palette is in place */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return entries;
}

/**
 * Shape returned by `GET /image-generation/v1/generations/:id/segmentation`.
 * Mirrors the FAL `fal-ai/sam-3-1/image` response that the backend
 * stores per category on `generation_segmentation`. Note that `image`
 * and each entry of `masks` are objects (NOT raw URLs) — earlier code
 * assumed bare strings and silently rendered nothing.
 */
interface SegmentationFalAsset {
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
}

interface SegmentationCategoryMetadataEntry {
  box?: number[];
  index?: number;
  score?: number;
}

interface SegmentationCategoryResponse {
  image?: SegmentationFalAsset | string | null;
  masks?: Array<SegmentationFalAsset | string> | null;
  scores?: number[] | null;
  boxes?: number[][] | null;
  metadata?: SegmentationCategoryMetadataEntry[] | Record<string, unknown> | null;
}

/**
 * FAL responses ship URLs inside `{ url, width, height, contentType }`
 * wrappers, but very early runs persisted plain strings. Accept both
 * so older `generation_segmentation` rows keep rendering.
 */
function assetUrl(asset: SegmentationFalAsset | string | null | undefined): string | null {
  if (!asset) return null;
  if (typeof asset === 'string') return asset.length > 0 ? asset : null;
  return typeof asset.url === 'string' && asset.url.length > 0 ? asset.url : null;
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

/**
 * Reason a per-category metric block is empty. Mirrors
 * `DriftAbsenceReason` in `service-image-generation`'s
 * `drift-assessment.ts` — kept literal so the UI copy can be
 * exhaustive over the enum at compile time.
 */
type DriftAbsenceReason = 'absent_in_dollhouse' | 'absent_in_sam' | 'absent_in_both';

interface DriftCategoryHeader {
  category: string;
  dollhousePixelCount: number;
  samPixelCount: number;
  absenceReason?: DriftAbsenceReason;
}

interface LargeObjectDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95SymmetricDistancePx: number | null;
  p95RefToPredPx: number | null;
  p95PredToRefPx: number | null;
  areaRatio: number | null;
}

interface SurfaceDriftMetrics extends DriftCategoryHeader {
  iou: number | null;
  boundaryDriftPx: number | null;
  boundaryRefToPredPx: number | null;
  boundaryPredToRefPx: number | null;
  pixelClassAccuracy: number | null;
}

interface SmallObjectDriftMetrics extends DriftCategoryHeader {
  presence: 0 | 1;
  centroidDriftPx: number | null;
  centroidDriftNormalized: number | null;
  p95DistancePx: number | null;
}

interface OverallDriftMetrics {
  /**
   * Per the user-spec, this is `mismatched_pixels / total_pixels`
   * (NOT the squared-error MSE). The backend keeps the `mse` field
   * name for continuity; we display it as "% mismatched" to make
   * the meaning unambiguous.
   */
  mse: number;
  pixelAccuracy: number;
  numMismatched: number;
  totalPixels: number;
}

/**
 * Persisted drift report comparing SAM masks against the dollhouse
 * product map. Stored on `generation_segmentation.drift_assessment`;
 * keys come back camelCased by the case-converter middleware. The
 * per-category records use the same camelCase SAM category keys as
 * the rest of the response (e.g. `wallTiles`, `showerCurbTiles`).
 */
interface DriftAssessment {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  overall: OverallDriftMetrics;
  largeObjects: Record<string, LargeObjectDriftMetrics>;
  surfaces: Record<string, SurfaceDriftMetrics>;
  smallObjects: Record<string, SmallObjectDriftMetrics>;
  failedSamMaskUrls?: string[];
}

/**
 * Subset of `DriftOutcome.status` the eval modal might receive on a
 * fresh POST response (it ignores this for GETs because the column
 * doesn't exist server-side).
 */
type DriftStatus =
  | 'computed'
  | 'no_dollhouse_view'
  | 'no_strategy_batch_run'
  | 'no_dollhouse_capture'
  | 'no_product_mask'
  | 'no_sam_results'
  | 'failed';

/**
 * Backend response shape for
 * `GET /image-generation/v1/generations/:id/segmentation`. The backend
 * stores one JSONB column per category on the `generation_segmentation`
 * row (`vanities`, `faucets`, `toilet_flush`, etc.), so the response
 * has those categories as **top-level** keys on `record` alongside the
 * row's metadata (`id`, `createdAt`, `combinedOverlayUrl`, `timings`).
 * Categories are NOT nested under a `results` field — earlier code
 * assumed they were and silently rendered nothing because the lookup
 * always missed.
 *
 * Unknown keys on the response that aren't in `RECORD_METADATA_KEYS`
 * are treated as category entries.
 */
interface SegmentationRecord {
  id?: string;
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
  /**
   * Drift breakdown vs the dollhouse product map for the same camera
   * frame. `null` (or absent) means drift couldn't be computed — see
   * `driftStatus` for the reason on POST responses, otherwise assume
   * the row predates the column or no dollhouse capture was available.
   */
  driftAssessment?: DriftAssessment | null;
  /** Only present on POST responses; the GET endpoint omits this. */
  driftStatus?: DriftStatus | null;
  // Categories (`vanities`, `faucets`, `toiletFlush`, …) land here, one
  // key per JSONB column on the backend row. TypeScript can't express
  // "every key except RECORD_METADATA_KEYS" cleanly, so we use an
  // unknown-valued index signature and narrow inside `buildRows`.
  [category: string]: unknown;
}

/**
 * Top-level keys on the segmentation record that describe the row
 * itself rather than per-category results. Anything outside this set
 * is treated as a SAM category payload.
 */
const RECORD_METADATA_KEYS = new Set<string>([
  'id',
  'generationResultId',
  'createdAt',
  'combinedOverlayUrl',
  'timings',
  // Drift comparison vs the dollhouse product map. Lives on the row
  // alongside the per-category JSONB columns; the case-converter
  // rewrites the column name to `driftAssessment` on response. Treat
  // it as metadata so `buildRows` doesn't try to interpret the metric
  // payload as a SAM category result.
  'driftAssessment',
  // Only present on the POST response synthesized from the run
  // outcome (`computed | no_dollhouse_view | no_sam_results | ...`).
  // The GET endpoint that this modal calls doesn't populate it
  // because it's not a DB column, but we include it here so the
  // record type stays in sync with the backend contract and the
  // metadata filter ignores it if a caller hands us a POST payload.
  'driftStatus',
]);

interface SegmentationResultsBadgeProps {
  generationId: string | null | undefined;
  /** Same per-id state the inline `SegmentationBadge` shows; the dot
   * only appears when this is `done`, so the icon doesn't compete with
   * the inline run/check spinner under the preset name. */
  state: SegmentationState | undefined;
}

interface CategoryMask {
  url: string;
  score: number | null;
}

interface CategoryRow {
  category: string;
  label: string;
  /** Hex color resolved via the backend's category palette. */
  color: string;
  /**
   * FAL's `image` field — typically a per-category composite (sometimes
   * just identical to the first entry of `masks`). Used as the headline
   * preview at the top of each card; `masks` is rendered below as a
   * grid so every individual prediction is visible.
   */
  composite: string | null;
  masks: CategoryMask[];
  topScore: number | null;
}

function buildRows(record: SegmentationRecord | null, lookup: CategoryLookup): CategoryRow[] {
  if (!record || typeof record !== 'object') return [];
  // Categories are top-level keys on the row. Walk every property,
  // skip the known row-metadata fields, and treat the rest as
  // potential category payloads. Anything that isn't a plain object
  // (e.g. categories that came back `null` because SAM had nothing to
  // segment for that prompt) falls through the `value` guard below.
  const entries = Object.entries(record).filter(
    ([key, value]) =>
      !RECORD_METADATA_KEYS.has(key) &&
      value !== null &&
      value !== undefined &&
      typeof value === 'object',
  );
  return (
    entries
      .map(([category, value]) => {
        const data = (value ?? {}) as SegmentationCategoryResponse;
        const rawMasks = Array.isArray(data.masks) ? data.masks : [];
        const scores = Array.isArray(data.scores) ? data.scores : [];
        const masks: CategoryMask[] = rawMasks
          .map((mask, idx): CategoryMask | null => {
            const url = assetUrl(mask);
            if (!url) return null;
            const score = typeof scores[idx] === 'number' ? scores[idx]! : null;
            return { url, score };
          })
          .filter((m): m is CategoryMask => m !== null);
        // Prefer the FAL-provided composite; fall back to the first mask
        // so single-mask categories still get a preview tile.
        const composite = assetUrl(data.image) ?? masks[0]?.url ?? null;
        // FAL only fills the per-prediction `masks` array when
        // `return_multiple_masks=true` is honored. For categories where
        // FAL collapsed everything into the single `image` (or older
        // rows from before that setting), promote the composite into
        // the masks list so the "Individual masks" grid always reflects
        // what was actually predicted. Without this, those categories
        // appear with just a composite and no per-mask tile/score.
        if (masks.length === 0 && composite) {
          const fallbackScore = typeof scores[0] === 'number' ? scores[0]! : null;
          masks.push({ url: composite, score: fallbackScore });
        }
        const numericScores = masks
          .map((m) => m.score)
          .filter((s): s is number => typeof s === 'number');
        return {
          category,
          label: lookup.label(category),
          color: lookup.color(category),
          composite,
          masks,
          topScore: numericScores.length > 0 ? Math.max(...numericScores) : null,
        };
      })
      // Drop categories that came back fully empty so the grid isn't
      // cluttered with "no masks detected" tiles for shower curb tiles
      // etc. — the legend / per-category status still surfaces via the
      // timeline panel for anyone debugging a zero-mask run.
      .filter((row) => row.masks.length > 0 || row.composite !== null)
      .sort((a, b) => a.label.localeCompare(b.label))
  );
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
  const categories = useSegmentationCategories();
  const lookup = useMemo(() => buildCategoryLookup(categories), [categories]);
  const rows = useMemo(() => buildRows(record, lookup), [record, lookup]);
  const totalMasks = rows.reduce((sum, row) => sum + row.masks.length, 0);

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
            <CollapsibleTimeline timings={record.timings} lookup={lookup} />
          )}
          {!loading &&
            !error &&
            record !== null &&
            // Render the section whenever the row has a `driftAssessment`
            // field at all — including the explicit-null case on GET
            // responses where drift was attempted but couldn't be
            // computed. Truthiness gating used to hide the "unavailable"
            // fallback for those rows. Older rows that predate the
            // column have `driftAssessment === undefined`, and we keep
            // those quiet.
            (record.driftAssessment !== undefined || record.driftStatus !== undefined) && (
              <CollapsibleDrift
                assessment={record.driftAssessment ?? null}
                status={record.driftStatus ?? null}
                lookup={lookup}
              />
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
            </div>
          )}
          {/* Render the legend whenever we have categories, even if the
              combined overlay PNG didn't get built (older row, sharp/S3
              hiccup, etc.). The per-card swatches use the same colors,
              so the legend is the user's anchor for what each tint
              means regardless of overlay presence. */}
          {!loading && !error && rows.length > 0 && (
            <div className="mb-5">
              <SegmentationLegend rows={rows} />
            </div>
          )}
          {!loading && !error && rows.length === 0 && !record?.combinedOverlayUrl && (
            <p className="py-12 text-center text-sm text-gray-500">
              No segmentation results to display.
            </p>
          )}
          {!loading && !error && rows.length > 0 && <CollapsibleCategoryGrid rows={rows} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Combined per-category mask preview built on a `<canvas>` by drawing
 * each mask PNG on top of a black background using `globalCompositeOperation = 'lighten'`.
 * SAM emits black-bg / white-shape masks, so `lighten` resolves to the
 * union of every white region — exactly what "merge all the masks for
 * this category" should look like.
 *
 * Why client-side and not in the backend overlay? The combined overlay
 * URL tints colors on top of the original photo, which is a different
 * artifact. Here we want a per-category black/white silhouette that
 * shows where SAM said this category lives, before any tinting. Doing
 * it on the canvas avoids another round-trip to the service and stays
 * trivially in sync whenever the underlying mask URLs change.
 *
 * No CORS handshake is required: we never read pixels back, we just
 * draw the images, so a tainted canvas is fine. If the image fetch
 * itself fails we surface a placeholder rather than the misleading
 * partial draw.
 */
function CompositeMaskCanvas({
  masks,
  alt,
  containerClassName,
  canvasClassName,
}: {
  masks: CategoryMask[];
  alt: string;
  containerClassName?: string;
  canvasClassName?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // Stable identity for `useEffect` so we don't repaint on every render
  // (each `buildRows` call returns fresh `masks` arrays even when the
  // URLs are unchanged).
  const maskKey = masks.map((m) => m.url).join('|');

  useEffect(() => {
    if (masks.length === 0) {
      setStatus('error');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    setStatus('loading');

    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load mask: ${url}`));
        img.src = url;
      });

    (async () => {
      try {
        const images = await Promise.all(masks.map((m) => loadImage(m.url)));
        if (cancelled) return;
        const first = images[0]!;
        // Cap to a sensible canvas size — masks are typically
        // 2400x1792 which is wasteful for a thumbnail tile.
        const MAX_DIM = 800;
        const scale = Math.min(1, MAX_DIM / Math.max(first.naturalWidth, first.naturalHeight));
        const width = Math.max(1, Math.round(first.naturalWidth * scale));
        const height = Math.max(1, Math.round(first.naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setStatus('error');
          return;
        }
        // Black background so any pixel not painted by a mask stays
        // black — matches SAM's individual-mask appearance.
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighten';
        for (const img of images) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- maskKey covers it
  }, [maskKey]);

  return (
    <div className={`relative ${containerClassName ?? ''}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gray-100" aria-hidden="true" />
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <p className="px-2 text-center text-[10px] text-gray-400 italic">No combined preview</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        aria-label={alt}
        className={`${canvasClassName ?? ''} transition-opacity duration-150 ${
          status === 'ready' ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

/**
 * Per-category card: combined mask preview on top (every mask blended
 * into one silhouette), then a grid of every individual mask
 * underneath with score badges so the user can inspect each prediction
 * separately.
 *
 * The combined preview is computed on a canvas at display time rather
 * than relying on FAL's `image` field, which (in practice) is just the
 * top-scored mask repeated — i.e. not actually a merge of all masks.
 */
function CategoryCard({ row }: { row: CategoryRow }) {
  const totalMasks = row.masks.length;
  const showIndividualMasks = totalMasks >= 1;
  const swatch = row.color;

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-sm ring-1 ring-gray-300"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
          <p className="truncate text-xs font-semibold text-gray-800" title={row.label}>
            {row.label}
          </p>
        </div>
        {row.topScore !== null && (
          <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] text-gray-700 tabular-nums ring-1 ring-gray-200">
            {row.topScore.toFixed(2)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[10px] text-gray-500">
        {totalMasks} {totalMasks === 1 ? 'mask' : 'masks'}
      </p>

      {row.masks.length > 0 ? (
        <div className="relative mt-2 block aspect-square w-full overflow-hidden rounded border border-gray-200 bg-white">
          <CompositeMaskCanvas
            masks={row.masks}
            alt={`${row.label} combined mask preview (${totalMasks} ${totalMasks === 1 ? 'mask' : 'masks'} merged)`}
            containerClassName="h-full w-full"
            canvasClassName="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-2 flex aspect-square w-full items-center justify-center rounded border border-dashed border-gray-200 bg-white">
          <p className="px-2 text-center text-[10px] text-gray-400 italic">No masks returned</p>
        </div>
      )}

      {showIndividualMasks && (
        <div className="mt-2">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            Individual masks
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {row.masks.map((mask, idx) => (
              <a
                key={`${mask.url}-${idx}`}
                href={mask.url}
                target="_blank"
                rel="noopener noreferrer"
                title={
                  mask.score !== null
                    ? `Mask ${idx + 1} · score ${mask.score.toFixed(3)}`
                    : `Mask ${idx + 1}`
                }
                className="group relative block aspect-square overflow-hidden rounded border border-gray-200 bg-white"
              >
                <SkeletonImage
                  src={mask.url}
                  alt={`${row.label} mask ${idx + 1}`}
                  containerClassName="h-full w-full"
                  imgClassName="h-full w-full object-contain"
                />
                {mask.score !== null && (
                  <span className="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-1 py-px text-[9px] font-medium text-white tabular-nums">
                    {mask.score.toFixed(2)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
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
        <div className="absolute inset-0 animate-pulse rounded bg-gray-200" aria-hidden="true" />
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
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <span
              className="text-[11px] leading-tight text-gray-700"
              title={`${row.label} · ${row.masks.length} ${row.masks.length === 1 ? 'mask' : 'masks'}`}
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

function readPerCategoryTimings(
  metadata: Record<string, unknown> | null | undefined,
): PerCategoryTiming[] {
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
 * Collapsible wrapper around `SegmentationTimelineSection`. The
 * timeline is interesting when debugging slow runs but is mostly noise
 * for everyday viewing, so it starts collapsed and the user opts in.
 *
 * Uses a button + state instead of native `<details>` so the header
 * styling matches the rest of the modal (and so we can show the
 * total-ms summary on the right even while collapsed).
 */
/**
 * Collapsible wrapper around the per-category cards grid. The grid is
 * heavy — it lazily loads/blends every mask PNG on a `<canvas>` per
 * card, plus a thumbnail per individual mask — so we keep it collapsed
 * by default and let the user opt into the full inspection view. The
 * header summarizes how many categories and masks are inside without
 * having to expand.
 */
function CollapsibleCategoryGrid({ rows }: { rows: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const totalMasks = rows.reduce((sum, row) => sum + row.masks.length, 0);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon
            className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Per-category masks
          </span>
          <span className="text-[11px] font-normal text-gray-500">
            {rows.length} {rows.length === 1 ? 'category' : 'categories'}
          </span>
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {totalMasks} {totalMasks === 1 ? 'mask' : 'masks'}
        </span>
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <CategoryCard key={row.category} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleTimeline({
  timings,
  lookup,
}: {
  timings: SegmentationTimings;
  lookup: CategoryLookup;
}) {
  const [open, setOpen] = useState(false);
  const stepCount = timings.steps.length;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon
            className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Execution timeline
          </span>
          <span className="text-[11px] font-normal text-gray-500">
            {stepCount} {stepCount === 1 ? 'step' : 'steps'}
          </span>
        </span>
        <span className="text-[11px] text-gray-500 tabular-nums">
          {formatMs(timings.totalMs)} total
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <SegmentationTimelineSection timings={timings} lookup={lookup} />
        </div>
      )}
    </div>
  );
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
function SegmentationTimelineSection({
  timings,
  lookup,
}: {
  timings: SegmentationTimings;
  lookup: CategoryLookup;
}) {
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
    <div>
      <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          {timings.steps.map((step, idx) => {
            const widthPct = Math.max((step.durationMs / inferredTotal) * 100, 0.5);
            const leftPct = Math.min((step.startMs / inferredTotal) * 100, 99.5);
            const sharePct = (step.durationMs / inferredTotal) * 100;
            return (
              <div
                key={`${step.name}-${idx}`}
                className="flex items-center gap-2 text-[11px] text-gray-700"
              >
                <span className="w-36 shrink-0 truncate" title={timelineStepLabel(step.name)}>
                  {timelineStepLabel(step.name)}
                </span>
                <div className="relative h-3 flex-1 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                  <div
                    className={`absolute top-0 bottom-0 ${timelineStepColor(step.name)}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`Started at ${formatMs(step.startMs)}, took ${formatMs(step.durationMs)} (${sharePct.toFixed(1)}%)`}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-gray-600 tabular-nums">
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
                  <span
                    className="w-36 shrink-0 truncate"
                    title={`${lookup.label(row.category)} — ${row.prompt}`}
                  >
                    {lookup.label(row.category)}
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded bg-white ring-1 ring-gray-200">
                    <div
                      className={`absolute inset-y-0 left-0 ${row.ok ? 'bg-purple-300' : 'bg-rose-300'}`}
                      style={{
                        width: `${Math.max(
                          (row.durationMs / Math.max(samStep?.durationMs ?? row.durationMs, 1)) *
                            100,
                          1,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-gray-600 tabular-nums">
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

/**
 * Human-readable copy for the non-`computed` drift statuses the backend
 * can return on a fresh POST. Used as a hint inside the section when
 * drift couldn't be computed so the QA reviewer doesn't have to guess
 * why the metrics are missing.
 */
const DRIFT_STATUS_LABELS: Record<Exclude<DriftStatus, 'computed'>, string> = {
  no_dollhouse_view: 'No dollhouse view URL was set on this generation.',
  no_strategy_batch_run: 'Generation is not tied to a dollhouse batch run.',
  no_dollhouse_capture: 'No dollhouse capture was stored for this batch run.',
  no_product_mask: 'The matched dollhouse capture has no product mask.',
  no_sam_results: 'SAM did not return any masks to compare against.',
  failed: 'Drift computation raised an error — see the server logs.',
};

/**
 * Friendly copy for the `absent_in_*` reasons on a per-category metric
 * block. Tracked on the row itself so the UI can explain why a metric
 * is `null` without re-deriving it from the pixel counts.
 */
const DRIFT_ABSENCE_LABELS: Record<DriftAbsenceReason, string> = {
  absent_in_dollhouse: 'Not in dollhouse',
  absent_in_sam: 'Missed by SAM',
  absent_in_both: 'Not in either',
};

function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function formatNumber(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(fractionDigits);
}

function formatPixels(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (Math.abs(value) < 10) return `${value.toFixed(1)} px`;
  return `${Math.round(value)} px`;
}

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString();
}

/**
 * Collapsible drift section. Header summarizes the overall MSE so the
 * reviewer sees the headline number without expanding; the body shows
 * an overall card plus three per-bucket tables (large objects /
 * surfaces / small objects) so they can attribute the drift to a
 * specific product type.
 *
 * When drift couldn't be computed (`status !== 'computed'` and no
 * `assessment`), we still render the header so reviewers know the
 * field was attempted and surface the reason inside.
 */
function CollapsibleDrift({
  assessment,
  status,
  lookup,
}: {
  assessment: DriftAssessment | null;
  status: DriftStatus | null;
  lookup: CategoryLookup;
}) {
  const [open, setOpen] = useState(false);
  const overall = assessment?.overall ?? null;
  const computed = !!assessment && (status === null || status === 'computed');

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon
            className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Drift assessment
          </span>
          {computed && assessment && (
            <span className="text-[11px] font-normal text-gray-500">
              {assessment.imageWidth}×{assessment.imageHeight}
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums">
          {computed && overall ? (
            <span className="text-gray-700">
              <span className="font-semibold">{formatPercent(overall.mse, 2)}</span>{' '}
              <span className="text-gray-500">mismatched</span>
            </span>
          ) : (
            <span className="text-gray-500">unavailable</span>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {!computed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {status && status !== 'computed' && DRIFT_STATUS_LABELS[status]
                ? DRIFT_STATUS_LABELS[status]
                : 'Drift assessment is not available for this segmentation row.'}
            </div>
          )}
          {computed && assessment && overall && (
            <>
              <DriftOverallCard overall={overall} />
              <DriftBucketTable
                title="Large objects"
                kind="largeObject"
                entries={assessment.largeObjects}
                lookup={lookup}
              />
              <DriftBucketTable
                title="Surfaces"
                kind="surface"
                entries={assessment.surfaces}
                lookup={lookup}
              />
              <DriftBucketTable
                title="Small objects"
                kind="smallObject"
                entries={assessment.smallObjects}
                lookup={lookup}
              />
              {assessment.failedSamMaskUrls && assessment.failedSamMaskUrls.length > 0 && (
                <p className="px-1 text-[10px] text-gray-500 italic">
                  {assessment.failedSamMaskUrls.length} SAM mask
                  {assessment.failedSamMaskUrls.length === 1 ? '' : 's'} failed to download —
                  metrics may understate SAM coverage.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Inline description rendered as a native browser tooltip (via the
 * `<abbr title>` element) so hovering any metric header explains what
 * the number means. The dotted underline is the default `abbr` UA
 * style, which is exactly the affordance we want — a subtle "this has
 * more info on hover" hint that doesn't compete with the table data.
 */
function MetricLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <abbr
      title={hint}
      className="cursor-help text-inherit no-underline decoration-gray-400 decoration-dotted underline-offset-2 hover:underline"
    >
      {label}
    </abbr>
  );
}

/**
 * Human-readable definitions for every drift metric the modal shows.
 * Centralized so the per-bucket headers and the overall card use the
 * same wording; if a reviewer asks "what does Area ratio mean?", it's
 * the same answer everywhere.
 */
const DRIFT_METRIC_HINTS = {
  iou: 'Intersection-over-Union: |SAM ∩ Dollhouse| / |SAM ∪ Dollhouse|. 1.00 = perfect overlap, 0 = no overlap.',
  centroid:
    'Euclidean distance (in pixels) between the SAM mask centroid and the dollhouse mask centroid. 0 = centroids coincide.',
  p95Symmetric:
    '95th-percentile symmetric Chamfer distance between mask boundaries, in pixels. Robust to a handful of outliers; lower is better.',
  p95Boundary:
    '95th-percentile symmetric Chamfer distance between surface boundaries, in pixels. Lower is better.',
  p95Small:
    '95th-percentile symmetric Chamfer distance between the aggregated SAM masks and the dollhouse mask for this category, in pixels.',
  areaRatio:
    'SAM mask area / dollhouse mask area. 1.00 = equal area, >1 = SAM is too big, <1 = SAM is too small.',
  pixelAccuracy:
    'Fraction of dollhouse pixels labeled with this category that SAM also assigned to it (per-class recall).',
  presence:
    '1 if SAM produced at least one mask for this category, 0 otherwise. Useful for accessories where size/shape vary a lot.',
  pixels:
    'Dollhouse pixel count / SAM pixel count for this category — context for the metric values to the left.',
  overallMse:
    'mismatched_pixels / total_pixels: the share of resized image pixels where SAM and the dollhouse map disagree on the category. 0 = perfect agreement.',
  overallPixelAccuracy:
    '1 − mismatched ratio: the share of pixels where SAM agrees with the dollhouse map.',
  overallRaw:
    'Raw mismatched-pixel count over total compared pixels (at the AI output resolution).',
} as const;

/**
 * Headline overall MSE card — the user explicitly asked for this to
 * be prominent, so it lives above the per-bucket tables and is the
 * first thing visible when the drift section is expanded.
 */
function DriftOverallCard({ overall }: { overall: OverallDriftMetrics }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Pixels mismatched" hint={DRIFT_METRIC_HINTS.overallMse} />
          </p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">
            {formatPercent(overall.mse, 2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Pixel accuracy" hint={DRIFT_METRIC_HINTS.overallPixelAccuracy} />
          </p>
          <p className="text-base font-medium text-gray-700 tabular-nums">
            {formatPercent(overall.pixelAccuracy, 2)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <MetricLabel label="Mismatched / total" hint={DRIFT_METRIC_HINTS.overallRaw} />
          </p>
          <p className="text-base font-medium text-gray-700 tabular-nums">
            {formatInt(overall.numMismatched)} / {formatInt(overall.totalPixels)}
          </p>
        </div>
      </div>
    </div>
  );
}

type DriftBucketKind = 'largeObject' | 'surface' | 'smallObject';

interface BucketHeader {
  label: string;
  hint: string;
}

/**
 * Per-bucket drift table. Each bucket gets its own metric columns
 * (large objects → IoU + centroid + p95 + area ratio, surfaces →
 * IoU + boundary + pixel-class accuracy, small objects → presence +
 * centroid + p95) so the layout matches the user's QA spec.
 *
 * Categories where neither the dollhouse map nor SAM produced any
 * pixels (`absent_in_both`) are filtered out — the row only exists in
 * the backend payload to keep the per-bucket schema dense, and showing
 * a wall of empty rows just dilutes the actually-interesting drift.
 * If every row in a bucket gets filtered out we drop the whole table.
 */
function DriftBucketTable({
  title,
  kind,
  entries,
  lookup,
}: {
  title: string;
  kind: DriftBucketKind;
  entries:
    | Record<string, LargeObjectDriftMetrics>
    | Record<string, SurfaceDriftMetrics>
    | Record<string, SmallObjectDriftMetrics>;
  lookup: CategoryLookup;
}) {
  const rows = Object.entries(entries).filter(
    ([, metrics]) => metrics.dollhousePixelCount > 0 || metrics.samPixelCount > 0,
  );
  if (rows.length === 0) return null;
  const headers = bucketHeaders(kind);

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="text-[10px] text-gray-500">
          {rows.length} {rows.length === 1 ? 'category' : 'categories'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-left text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-1.5">Category</th>
              {headers.map((header) => (
                <th key={header.label} className="px-3 py-1.5 text-right tabular-nums">
                  <MetricLabel label={header.label} hint={header.hint} />
                </th>
              ))}
              <th className="px-3 py-1.5 text-right tabular-nums">
                <MetricLabel label="Pixels (D/S)" hint={DRIFT_METRIC_HINTS.pixels} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {rows.map(([key, metrics]) => (
              <DriftBucketRow
                key={key}
                category={key}
                metrics={metrics}
                kind={kind}
                lookup={lookup}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function bucketHeaders(kind: DriftBucketKind): BucketHeader[] {
  switch (kind) {
    case 'largeObject':
      return [
        { label: 'IoU', hint: DRIFT_METRIC_HINTS.iou },
        { label: 'Centroid', hint: DRIFT_METRIC_HINTS.centroid },
        { label: 'p95 dist', hint: DRIFT_METRIC_HINTS.p95Symmetric },
        { label: 'Area ratio', hint: DRIFT_METRIC_HINTS.areaRatio },
      ];
    case 'surface':
      return [
        { label: 'IoU', hint: DRIFT_METRIC_HINTS.iou },
        { label: 'Boundary', hint: DRIFT_METRIC_HINTS.p95Boundary },
        { label: 'Pixel acc.', hint: DRIFT_METRIC_HINTS.pixelAccuracy },
      ];
    case 'smallObject':
      return [
        { label: 'Presence', hint: DRIFT_METRIC_HINTS.presence },
        { label: 'Centroid', hint: DRIFT_METRIC_HINTS.centroid },
        { label: 'p95 dist', hint: DRIFT_METRIC_HINTS.p95Small },
      ];
  }
}

function DriftBucketRow({
  category,
  metrics,
  kind,
  lookup,
}: {
  category: string;
  metrics: LargeObjectDriftMetrics | SurfaceDriftMetrics | SmallObjectDriftMetrics;
  kind: DriftBucketKind;
  lookup: CategoryLookup;
}) {
  const label = lookup.label(category);
  const swatch = lookup.color(category);

  return (
    <tr className="align-top">
      <td className="px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-gray-300"
            style={{ backgroundColor: swatch }}
            aria-hidden="true"
          />
          <span className="truncate" title={label}>
            {label}
          </span>
          {metrics.absenceReason && (
            <span
              className="ml-1 shrink-0 rounded bg-gray-100 px-1 py-px text-[9px] font-medium text-gray-600 ring-1 ring-gray-200"
              title={DRIFT_ABSENCE_LABELS[metrics.absenceReason]}
            >
              {DRIFT_ABSENCE_LABELS[metrics.absenceReason]}
            </span>
          )}
        </div>
      </td>
      {renderBucketCells(metrics, kind)}
      <td className="px-3 py-1.5 text-right text-gray-500 tabular-nums">
        {formatInt(metrics.dollhousePixelCount)} / {formatInt(metrics.samPixelCount)}
      </td>
    </tr>
  );
}

function renderBucketCells(
  metrics: LargeObjectDriftMetrics | SurfaceDriftMetrics | SmallObjectDriftMetrics,
  kind: DriftBucketKind,
) {
  if (kind === 'largeObject') {
    const m = metrics as LargeObjectDriftMetrics;
    return (
      <>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(m.iou, 3)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatPixels(m.centroidDriftPx)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">
          {formatPixels(m.p95SymmetricDistancePx)}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(m.areaRatio, 2)}</td>
      </>
    );
  }
  if (kind === 'surface') {
    const m = metrics as SurfaceDriftMetrics;
    return (
      <>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(m.iou, 3)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">{formatPixels(m.boundaryDriftPx)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums">
          {formatPercent(m.pixelClassAccuracy, 1)}
        </td>
      </>
    );
  }
  const m = metrics as SmallObjectDriftMetrics;
  return (
    <>
      <td className="px-3 py-1.5 text-right tabular-nums">
        {m.presence === 1 ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            yes
          </span>
        ) : (
          <span className="rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
            no
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatPixels(m.centroidDriftPx)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatPixels(m.p95DistancePx)}</td>
    </>
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

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
