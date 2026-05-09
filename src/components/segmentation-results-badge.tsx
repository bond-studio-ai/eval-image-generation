'use client';

import type { SegmentationState } from '@/components/segmentation-badge';
import { serviceUrl } from '@/lib/api-base';
import { useEffect, useMemo, useState } from 'react';

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

interface SegmentationRecord {
  generationResultId?: string;
  createdAt?: string;
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
          {!loading && !error && rows.length === 0 && (
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={row.composite}
                        alt={`${row.label} segmentation overlay`}
                        loading="lazy"
                        className="h-full w-full object-contain"
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
