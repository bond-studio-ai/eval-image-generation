'use client';

import { ExpandableImage } from '@/components/expandable-image';
import { buildPanels, ReasoningModal } from '@/components/judge-score-badge';
import { PageHeader } from '@/components/page-header';
import { RunJudgeEvaluationsSection } from '@/components/run-judge-evaluations-section';
import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { ViewPromptModal } from '@/components/view-prompt-modal';
import { serviceUrl } from '@/lib/api-base';
import {
  parseStrategyRunJudgeResults,
  type StrategyRunJudgeResultEntry,
} from '@/lib/strategy-run-judge-results';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface StepInfo {
  stepOrder: number;
  name: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  dollhouseViewFromStep: number | null;
  realPhotoFromStep: number | null;
  moodBoardFromStep: number | null;
  promptVersion: { id: string; name: string | null } | null;
}

interface InputImage {
  url: string;
  label: string;
  isComposite?: boolean;
  sourceImages?: { url: string; label: string }[];
}

/**
 * Per-category SAM 3.1 response. The backend stores the raw FAL payload as JSONB
 * and the case-converter middleware passes it through as-is (single-word keys);
 * we treat fields defensively because per-category responses can be sparse.
 */
interface SegmentationCategoryResponse {
  image?: string | null;
  masks?: string[];
  scores?: number[];
  boxes?: number[][];
  metadata?: Record<string, unknown> | null;
}

interface Segmentation {
  generationResultId: string;
  createdAt: string;
  // `results` is raw backend JSON; older/partial payloads may omit it entirely
  // or send `null`, so callers must guard before iterating.
  results: Record<string, SegmentationCategoryResponse | null | undefined> | null | undefined;
}

interface StepResult {
  id: string;
  status: string;
  outputUrl: string | null;
  error: string | null;
  executionTime: number | null;
  generationId: string | null;
  isJudgeSelected: boolean;
  processedUserPrompt: string | null;
  processedSystemPrompt: string | null;
  inputImages: InputImage[] | null;
  requestConfig: Record<string, unknown> | null;
  step: StepInfo | null;
  segmentation: Segmentation | null;
}

interface StepGroup {
  stepOrder: number;
  name: string;
  model: string;
  step: StepInfo | null;
  results: StepResult[];
}

interface RunData {
  id: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  judgeScore: number | null;
  isJudgeSelected: boolean;
  judgeReasoning: string | null;
  judgeOutput: string | null;
  source: string | null;
  judgeSystemPrompt: string | null;
  judgeUserPrompt: string | null;
  judgeInputImages: InputImage[] | null;
  judgeTypeUsed: string | null;
  judgeResults: StrategyRunJudgeResultEntry[];
  strategy: {
    id: string;
    name: string;
    model?: string;
    aspectRatio?: string;
    outputResolution?: string;
    temperature?: string | null;
    useGoogleSearch?: boolean;
    tagImages?: boolean;
    hasJudge?: boolean;
  };
  stepResults: StepResult[];
}

const POLL_INTERVAL = 3000;

const SOURCE_LABELS: Record<string, string> = {
  preset: 'Preset Run',
  raw_input: 'Real Input',
  batch: 'Batch Run',
  retry: 'Retry',
};

const CONFIG_LABELS: Record<string, string> = {
  model: 'Model',
  aspect_ratio: 'Aspect Ratio',
  output_resolution: 'Resolution',
  temperature: 'Temperature',
  use_google_search: 'Google Search',
  tag_images: 'Tag Images',
};

/* ---------- small reusable pieces ---------- */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-amber-100 text-amber-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    preset: 'bg-blue-100 text-blue-700',
    raw_input: 'bg-purple-100 text-purple-700',
    batch: 'bg-teal-100 text-teal-700',
    retry: 'bg-orange-100 text-orange-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[source] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

function ChevronIcon({ open, className = 'h-4 w-4' }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className} shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function SectionToggle({
  title,
  count,
  badge,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronIcon open={open} />
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {count != null && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {count}
          </span>
        )}
        {badge}
      </button>
      {open && <div className="border-t border-gray-200">{children}</div>}
    </div>
  );
}

/* ---------- Audit sub-components ---------- */

function AuditImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {images.map((img, i) => (
          <div key={i} className="group relative">
            {img.isComposite ? (
              <div
                className="aspect-square cursor-pointer overflow-hidden rounded-md border border-violet-400 bg-gray-50 ring-1 ring-violet-200"
                role="button"
                onClick={() => setExpandedGroup(expandedGroup === i ? null : i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.label}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <ExpandableImage
                src={img.url}
                alt={img.label}
                wrapperClassName="relative block aspect-square w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                className="h-full w-full object-cover"
              />
            )}
            <div className="mt-1 flex items-center gap-1">
              {img.isComposite && (
                <span className="inline-flex shrink-0 items-center rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700">
                  Group
                </span>
              )}
              <p className="truncate text-[10px] leading-tight text-gray-500" title={img.label}>
                {img.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {expandedGroup != null &&
        images[expandedGroup]?.isComposite &&
        images[expandedGroup].sourceImages && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-violet-800">
                {images[expandedGroup].label} &mdash; {images[expandedGroup].sourceImages!.length}{' '}
                source images
              </p>
              <button
                onClick={() => setExpandedGroup(null)}
                className="text-xs text-violet-600 hover:text-violet-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {images[expandedGroup].sourceImages!.map((src, j) => (
                <div key={j}>
                  <ExpandableImage
                    src={src.url}
                    alt={src.label}
                    wrapperClassName="relative block aspect-square w-full overflow-hidden rounded-md border border-violet-200 bg-white"
                    className="h-full w-full object-cover"
                  />
                  <p
                    className="mt-1 truncate text-[10px] leading-tight text-violet-700"
                    title={src.label}
                  >
                    {src.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function AuditCollapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
      >
        <ChevronIcon open={open} className="h-3 w-3" />
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function StepAudit({ sr }: { sr: StepResult }) {
  const hasAudit =
    sr.processedSystemPrompt || sr.processedUserPrompt || sr.inputImages || sr.requestConfig;
  if (!hasAudit) return null;

  return (
    <AuditCollapsible title="Audit Details">
      <div className="space-y-3">
        {sr.requestConfig && (
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Request Config
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sr.requestConfig).map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                >
                  <span className="font-medium text-gray-500">{CONFIG_LABELS[key] ?? key}:</span>
                  &nbsp;{String(val ?? 'null')}
                </span>
              ))}
            </div>
          </div>
        )}
        {sr.processedSystemPrompt && (
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              System Prompt
            </p>
            <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
              {sr.processedSystemPrompt}
            </pre>
          </div>
        )}
        {sr.processedUserPrompt && (
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              User Prompt
            </p>
            <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
              {sr.processedUserPrompt}
            </pre>
          </div>
        )}
        {sr.inputImages && sr.inputImages.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Input Images ({sr.inputImages.length})
            </p>
            <AuditImageGrid images={sr.inputImages} />
          </div>
        )}
      </div>
    </AuditCollapsible>
  );
}

/* ---------- Segmentation ---------- */

/**
 * Human-friendly labels for the 23 product categories the backend may segment.
 * Falls back to a generic snake_case → Title Case transform for any new key
 * the backend might introduce later.
 */
const SEGMENTATION_CATEGORY_LABELS: Record<string, string> = {
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
};

function categoryLabel(category: string): string {
  return (
    SEGMENTATION_CATEGORY_LABELS[category] ??
    category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface SegmentationCategoryRow {
  category: string;
  label: string;
  composite: string | null;
  maskCount: number;
  topScore: number | null;
  raw: SegmentationCategoryResponse;
}

function buildSegmentationRows(segmentation: Segmentation): SegmentationCategoryRow[] {
  const results = segmentation.results;
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
        raw: data,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function SegmentationPanel({ segmentation }: { segmentation: Segmentation }) {
  const [showRaw, setShowRaw] = useState(false);
  const rows = buildSegmentationRows(segmentation);

  if (rows.length === 0) return null;

  const totalMasks = rows.reduce((sum, row) => sum + row.maskCount, 0);

  return (
    <AuditCollapsible
      title={`Segmentation · ${rows.length} ${rows.length === 1 ? 'category' : 'categories'} · ${totalMasks} ${totalMasks === 1 ? 'mask' : 'masks'}`}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((row) => (
            <div key={row.category} className="rounded-md border border-gray-200 bg-gray-50 p-2">
              <div className="flex items-baseline justify-between gap-1">
                <p className="truncate text-[11px] font-semibold text-gray-700" title={row.label}>
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
                <ExpandableImage
                  src={row.composite}
                  alt={`${row.label} segmentation overlay`}
                  wrapperClassName="relative mt-2 block aspect-square w-full overflow-hidden rounded border border-gray-200 bg-white"
                  className="h-full w-full object-contain"
                />
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
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span>
            Result {segmentation.generationResultId.slice(0, 8)}… ·{' '}
            {new Date(segmentation.createdAt).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-gray-500 underline hover:text-gray-700"
          >
            {showRaw ? 'Hide' : 'Show'} raw JSON
          </button>
        </div>
        {showRaw && (
          <pre className="max-h-72 overflow-auto rounded-md border border-gray-200 bg-white p-2 text-[10px] leading-snug text-gray-700">
            {JSON.stringify(segmentation.results, null, 2)}
          </pre>
        )}
      </div>
    </AuditCollapsible>
  );
}

/* ---------- Grouping helper ---------- */

function groupStepResults(sorted: StepResult[]): StepGroup[] {
  const map = new Map<number, StepGroup>();
  for (const sr of sorted) {
    const order = sr.step?.stepOrder ?? 0;
    if (!map.has(order)) {
      map.set(order, {
        stepOrder: order,
        name: sr.step?.name || `Step ${order}`,
        model: sr.step?.model ?? '',
        step: sr.step,
        results: [],
      });
    }
    map.get(order)!.results.push(sr);
  }
  return [...map.values()].sort((a, b) => a.stepOrder - b.stepOrder);
}

/* ---------- Generation image tile ---------- */

function GenerationTile({
  sr,
  index,
  total,
  isSelected,
}: {
  sr: StepResult;
  index: number;
  total: number;
  isSelected: boolean;
}) {
  const label = `${index + 1} of ${total}`;

  if (sr.status === 'completed' && sr.outputUrl) {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className={`relative overflow-hidden rounded-lg border-2 ${isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'}`}
        >
          <ExpandableImage
            src={sr.outputUrl}
            alt={`Generation ${index + 1}`}
            wrapperClassName="relative block h-48 w-full cursor-pointer bg-gray-50"
          />
          {isSelected && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Judge pick
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          {sr.executionTime != null && (
            <span className="tabular-nums">{(sr.executionTime / 1000).toFixed(1)}s</span>
          )}
          <StatusBadge status={sr.status} />
          {sr.generationId && (
            <Link
              href={`/generations/${sr.generationId}`}
              className="text-primary-600 hover:text-primary-500"
            >
              Detail &rarr;
            </Link>
          )}
        </div>
        {sr.segmentation && <SegmentationPanel segmentation={sr.segmentation} />}
      </div>
    );
  }

  if (sr.status === 'failed') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 p-3">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
            />
          </svg>
          <div className="text-center">
            <p className="text-xs font-semibold text-red-700">Generation failed</p>
            {sr.error && (
              <p className="mt-1 line-clamp-3 text-[10px] leading-tight text-red-600">{sr.error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === 'running') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative h-48 w-full overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50" />
          <div className="relative flex h-full flex-col items-center justify-center gap-2">
            <svg className="h-6 w-6 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
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
            <span className="text-xs font-medium text-blue-600">Generating...</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  if (sr.status === 'skipped') {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3">
          <svg
            className="h-6 w-6 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
            />
          </svg>
          <span className="text-xs font-medium text-amber-600">Skipped</span>
          {sr.error && (
            <p className="line-clamp-2 text-center text-[10px] leading-tight text-amber-500">
              {sr.error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span className="font-medium text-gray-700">{label}</span>
          <StatusBadge status={sr.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-48 w-full overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">Waiting...</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <StatusBadge status={sr.status} />
      </div>
    </div>
  );
}

/* ---------- Step group card ---------- */

function StepGroupCard({
  group,
  defaultOpen,
  onViewPrompt,
}: {
  group: StepGroup;
  defaultOpen: boolean;
  onViewPrompt: (
    id: string,
    name: string | null,
    processedSystemPrompt: string | null,
    processedUserPrompt: string | null,
  ) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isMulti = group.results.length > 1;
  const step = group.step;
  const representative = group.results[0];

  const completedCount = group.results.filter((r) => r.status === 'completed').length;
  const failedCount = group.results.filter((r) => r.status === 'failed').length;
  const runningCount = group.results.filter((r) => r.status === 'running').length;

  const groupStatus =
    runningCount > 0
      ? 'running'
      : failedCount === group.results.length
        ? 'failed'
        : completedCount > 0
          ? 'completed'
          : (group.results[0]?.status ?? 'pending');

  const statusDot: Record<string, string> = {
    pending: 'bg-gray-300',
    running: 'bg-blue-400 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    skipped: 'bg-amber-400',
  };

  // Candidates run in parallel within a generation step, so the step's
  // wall-clock is the slowest candidate, not the sum of all candidates.
  const stepWallClockMs = group.results.reduce(
    (longest, r) => Math.max(longest, r.executionTime ?? 0),
    0,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronIcon open={open} />
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot[groupStatus] ?? statusDot.pending}`}
        />
        <span className="text-sm font-semibold text-gray-900">{group.name}</span>
        {isMulti && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            &times;{group.results.length}
          </span>
        )}
        <span className="text-xs text-gray-500">{group.model}</span>
        {step?.promptVersion && (
          <span className="hidden text-xs text-gray-400 sm:inline">
            · {step.promptVersion.name || 'Untitled prompt'}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {stepWallClockMs > 0 && (
            <span
              className="text-xs text-gray-400 tabular-nums"
              title={isMulti ? 'Longest candidate (parallel)' : 'Generation time'}
            >
              {(stepWallClockMs / 1000).toFixed(1)}s
            </span>
          )}
          <StatusBadge status={groupStatus} />
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            {/* Step-from badges */}
            {(step?.dollhouseViewFromStep ||
              step?.realPhotoFromStep ||
              step?.moodBoardFromStep) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {step.dollhouseViewFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Dollhouse View &larr; Step {step.dollhouseViewFromStep}
                  </span>
                )}
                {step.realPhotoFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Real Photo &larr; Step {step.realPhotoFromStep}
                  </span>
                )}
                {step.moodBoardFromStep && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                    Mood Board &larr; Step {step.moodBoardFromStep}
                  </span>
                )}
              </div>
            )}

            {/* Prompt link */}
            {step?.promptVersion && (
              <div className="mb-3 flex items-center gap-3 text-xs">
                <span className="text-gray-500">Prompt:</span>
                <Link
                  href={`/prompt-versions/${step.promptVersion.id}`}
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  {step.promptVersion.name || 'Untitled'}
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPrompt(
                      step.promptVersion!.id,
                      step.promptVersion!.name,
                      representative?.processedSystemPrompt ?? null,
                      representative?.processedUserPrompt ?? null,
                    );
                  }}
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  View prompt
                </button>
              </div>
            )}

            {/* Multiple executions of the same step */}
            {isMulti ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                  {group.results.length} generations from this step
                </p>
                <div
                  className={`grid gap-3 ${group.results.length === 2 ? 'grid-cols-2' : group.results.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}
                >
                  {group.results.map((sr, i) => (
                    <GenerationTile
                      key={sr.id}
                      sr={sr}
                      index={i}
                      total={group.results.length}
                      isSelected={sr.isJudgeSelected}
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Single result */
              (() => {
                const sr = representative;
                if (!sr) return <p className="py-4 text-sm text-gray-400">No results</p>;
                if (sr.status === 'completed' && sr.outputUrl) {
                  return (
                    <div>
                      <ExpandableImage
                        src={sr.outputUrl}
                        alt={`${group.name} output`}
                        wrapperClassName="relative block h-80 w-full max-w-xl rounded-lg border border-gray-200 bg-gray-50"
                      />
                      {sr.generationId && (
                        <p className="mt-2 text-xs text-gray-500">
                          <Link
                            href={`/generations/${sr.generationId}`}
                            className="text-primary-600 hover:text-primary-500"
                          >
                            View generation detail &rarr;
                          </Link>
                        </p>
                      )}
                      {sr.segmentation && (
                        <div className="mt-3">
                          <SegmentationPanel segmentation={sr.segmentation} />
                        </div>
                      )}
                    </div>
                  );
                }
                if (sr.status === 'failed') {
                  return (
                    <div className="flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4">
                      <svg
                        className="h-5 w-5 shrink-0 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-red-700">Generation failed</p>
                        {sr.error && <p className="mt-0.5 text-sm text-red-600">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === 'skipped') {
                  return (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <svg
                        className="h-5 w-5 shrink-0 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Step skipped</p>
                        {sr.error && <p className="mt-0.5 text-sm text-amber-600">{sr.error}</p>}
                      </div>
                    </div>
                  );
                }
                if (sr.status === 'running') {
                  return (
                    <div className="relative h-56 w-full max-w-xl overflow-hidden rounded-lg border border-blue-300 bg-blue-50">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50" />
                      <div className="relative flex h-full flex-col items-center justify-center gap-3">
                        <svg
                          className="h-8 w-8 animate-spin text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        <span className="text-sm font-medium text-blue-600">
                          Generating image...
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="relative h-56 w-full max-w-xl overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
                    <div className="relative flex h-full flex-col items-center justify-center gap-2">
                      <div className="h-8 w-8 rounded-full border-2 border-gray-300 bg-gray-200" />
                      <span className="text-sm font-medium text-gray-400">Waiting to start...</span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Audit for first result (representative) */}
          {representative && <StepAudit sr={representative} />}
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

export function RunDetail({
  strategyId,
  runId,
  initialData,
}: {
  strategyId: string;
  runId: string;
  initialData: RunData;
}) {
  const [data, setData] = useState<RunData>(initialData);
  const [retrying, setRetrying] = useState(false);
  const [markingStatus, setMarkingStatus] = useState<'idle' | 'failed' | 'completed'>('idle');
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null);
  const [viewingPromptName, setViewingPromptName] = useState<string | null>(null);
  const [viewingProcessedSystemPrompt, setViewingProcessedSystemPrompt] = useState<string | null>(
    null,
  );
  const [viewingProcessedUserPrompt, setViewingProcessedUserPrompt] = useState<string | null>(null);
  const [showJudgeModal, setShowJudgeModal] = useState(false);

  const [showExecFlow, setShowExecFlow] = useState(false);
  const [showJudge, setShowJudge] = useState(true);
  const [showSteps, setShowSteps] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = data.status === 'running' || data.status === 'pending';

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}`), { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) {
        const raw = json.data as Record<string, unknown>;
        setData({
          ...(json.data as RunData),
          judgeResults: parseStrategyRunJudgeResults(raw.judgeResults),
        });
      }
    } catch {
      /* ignore */
    }
  }, [runId]);

  useEffect(() => {
    if (isActive) {
      fetchData();
      intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, fetchData]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch(serviceUrl(`strategy-runs/${runId}/retry`), { method: 'POST' });
      if (!res.ok) return;
      await fetchData();
    } catch {
      /* ignore */
    } finally {
      setRetrying(false);
    }
  }, [runId, fetchData]);

  const handleMarkStatus = useCallback(
    async (status: 'failed' | 'completed') => {
      setMarkingStatus(status);
      try {
        const res = await fetch(serviceUrl(`strategy-runs/${runId}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) return;
        await fetchData();
      } catch {
        /* ignore */
      } finally {
        setMarkingStatus('idle');
      }
    },
    [runId, fetchData],
  );

  const sorted = [...data.stepResults].sort(
    (a, b) => (a.step?.stepOrder ?? 0) - (b.step?.stepOrder ?? 0),
  );

  const stepGroups = groupStepResults(sorted);

  const dagSteps: DagStep[] = stepGroups
    .filter((g) => g.step)
    .map((g) => {
      const anyCompleted = g.results.some((r) => r.status === 'completed');
      const anyRunning = g.results.some((r) => r.status === 'running');
      const anyFailed = g.results.some((r) => r.status === 'failed');
      const status = anyRunning
        ? 'running'
        : anyCompleted
          ? 'completed'
          : anyFailed
            ? 'failed'
            : ((g.results[0]?.status as DagStep['status']) ?? 'pending');
      return {
        stepOrder: g.stepOrder,
        label: g.name,
        model: g.step!.model,
        aspectRatio: g.step!.aspectRatio,
        outputResolution: g.step!.outputResolution,
        temperature: g.step!.temperature,
        promptName: g.step!.promptVersion?.name,
        dollhouseViewFromStep: g.step!.dollhouseViewFromStep,
        realPhotoFromStep: g.step!.realPhotoFromStep,
        moodBoardFromStep: g.step!.moodBoardFromStep,
        status,
        error: g.results.find((r) => r.error)?.error ?? null,
      };
    });

  const dagJudges = [...new Map(data.judgeResults.map((j) => [j.strategyJudgeId, j])).values()]
    .sort((a, b) => a.position - b.position)
    .map((j) => ({
      name: j.judgeName,
      type: j.judgeType,
      model: j.judgeModel,
      promptName: j.judgePromptVersionName,
      position: j.position,
    }));

  const elapsedStart = data.startedAt ?? data.createdAt;
  const duration = data.completedAt
    ? Math.round((new Date(data.completedAt).getTime() - new Date(elapsedStart).getTime()) / 1000)
    : null;

  const hasJudgeInfo =
    data.judgeResults.length > 0 ||
    data.judgeReasoning ||
    data.judgeSystemPrompt ||
    data.judgeUserPrompt;
  const hasConfig = data.strategy.model != null || data.strategy.aspectRatio != null;

  const handleViewPrompt = useCallback(
    (
      id: string,
      name: string | null,
      processedSystemPrompt: string | null,
      processedUserPrompt: string | null,
    ) => {
      setViewingPromptId(id);
      setViewingPromptName(name);
      setViewingProcessedSystemPrompt(processedSystemPrompt);
      setViewingProcessedUserPrompt(processedUserPrompt);
    },
    [],
  );

  return (
    <div>
      <PageHeader
        backHref={`/strategies/${strategyId}`}
        backLabel={`Back to ${data.strategy.name}`}
        title="Strategy Run"
        subtitle={`${data.strategy.name} · ${new Date(data.createdAt).toLocaleString()}`}
      />

      {/* ──── Summary card ──── */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Status + source */}
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <SourceBadge source={data.source} />
          </div>

          {/* Timing */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Created {new Date(data.createdAt).toLocaleString()}</span>
            {duration != null && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
                {duration >= 60
                  ? `${Math.floor(duration / 60)}m ${duration % 60}s`
                  : `${duration}s`}
              </span>
            )}
            <span>
              {stepGroups.length} {stepGroups.length === 1 ? 'step' : 'steps'} · {sorted.length}{' '}
              {sorted.length === 1 ? 'generation' : 'generations'}
            </span>
          </div>

          {/* Judge score */}
          {data.judgeScore != null && data.judgeScore > 0 && (
            <button
              type="button"
              onClick={() => setShowJudgeModal(true)}
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${data.isJudgeSelected ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {data.isJudgeSelected && (
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
              Score: {data.judgeScore}
            </button>
          )}
          {(data.judgeScore === 0 ||
            (data.strategy.hasJudge &&
              data.status === 'completed' &&
              sorted.some((sr) => sr.outputUrl) &&
              data.judgeScore == null)) && (
            <button
              type="button"
              onClick={() => setShowJudgeModal(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              Judge failed
            </button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {data.status !== 'failed' && data.status !== 'skipped' && (
              <button
                type="button"
                onClick={() => handleMarkStatus('failed')}
                disabled={markingStatus !== 'idle'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                {markingStatus === 'failed' && <Spinner />}
                Mark failed
              </button>
            )}
            {(data.status === 'failed' || data.status === 'skipped') && (
              <>
                <button
                  type="button"
                  onClick={() => handleMarkStatus('completed')}
                  disabled={markingStatus !== 'idle'}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  {markingStatus === 'completed' && <Spinner />}
                  Mark completed
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                >
                  {retrying ? (
                    <Spinner />
                  ) : (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                      />
                    </svg>
                  )}
                  Retry
                </button>
              </>
            )}
          </div>
        </div>

        {hasConfig && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {data.strategy.model != null && <ConfigTag label="Model" value={data.strategy.model} />}
            {data.strategy.aspectRatio != null && (
              <ConfigTag label="Aspect" value={data.strategy.aspectRatio} />
            )}
            {data.strategy.outputResolution != null && (
              <ConfigTag label="Resolution" value={data.strategy.outputResolution} />
            )}
            {data.strategy.temperature != null && (
              <ConfigTag label="Temp" value={String(data.strategy.temperature)} />
            )}
            {data.strategy.tagImages != null && (
              <ConfigTag label="Tag images" value={data.strategy.tagImages ? 'Yes' : 'No'} />
            )}
            {data.strategy.useGoogleSearch != null && (
              <ConfigTag
                label="Google Search"
                value={data.strategy.useGoogleSearch ? 'Yes' : 'No'}
              />
            )}
          </div>
        )}
      </div>

      {/* ──── Skipped reasons ──── */}
      {data.status === 'skipped' &&
        (() => {
          const reasons = sorted
            .filter((sr) => sr.status === 'skipped' && sr.error)
            .map((sr) => ({
              step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`,
              reason: sr.error!,
            }));
          if (reasons.length === 0) return null;
          return (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">Why this run was skipped</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
                {reasons.map(({ step, reason }, i) => (
                  <li key={i}>
                    <span className="font-medium">{step}:</span> {reason}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

      {/* ──── Failed reasons ──── */}
      {data.status === 'failed' &&
        (() => {
          const reasons = sorted
            .filter((sr) => (sr.status === 'failed' || sr.status === 'skipped') && sr.error)
            .map((sr) => ({
              step: sr.step?.name ?? `Step ${sr.step?.stepOrder}`,
              reason: sr.error!,
            }));
          if (reasons.length === 0) return null;
          return (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">Why this run failed</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                {reasons.map(({ step, reason }, i) => (
                  <li key={i}>
                    <span className="font-medium">{step}:</span> {reason}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

      {/* ──── Collapsible sections ──── */}
      <div className="mt-6 space-y-4">
        {/* Execution Flow */}
        {dagSteps.length > 0 && (
          <SectionToggle
            title="Execution Flow"
            open={showExecFlow}
            onToggle={() => setShowExecFlow(!showExecFlow)}
          >
            <div className="p-4">
              <StrategyFlowDag steps={dagSteps} judges={dagJudges} />
            </div>
          </SectionToggle>
        )}

        {/* Judge Evaluation */}
        {hasJudgeInfo && (
          <SectionToggle
            title="Judge Evaluation"
            open={showJudge}
            onToggle={() => setShowJudge(!showJudge)}
            count={data.judgeResults.length || undefined}
            badge={
              data.judgeScore != null && data.judgeScore > 0 ? (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.isJudgeSelected ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  Score: {data.judgeScore}
                </span>
              ) : undefined
            }
          >
            <div className="space-y-4 p-4">
              {/* Per-judge evaluations */}
              {data.judgeResults.length > 0 && (
                <RunJudgeEvaluationsSection judgeResults={data.judgeResults} />
              )}

              {/* Aggregate judge reasoning (skip when single judge row already shows it) */}
              {data.judgeResults.length !== 1 &&
                data.judgeReasoning &&
                (() => {
                  const isFailed = data.judgeScore === 0;
                  return (
                    <div
                      className={`rounded-lg border p-4 ${isFailed ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}
                    >
                      <p
                        className={`text-sm font-medium ${isFailed ? 'text-red-800' : 'text-indigo-800'}`}
                      >
                        {isFailed ? 'Judge Error' : 'Judge Reasoning'}
                        {data.judgeScore != null && data.judgeScore > 0 && (
                          <span className="ml-2 font-normal text-indigo-600">
                            (Score: {data.judgeScore}
                            {data.isJudgeSelected ? ' — Selected' : ''})
                          </span>
                        )}
                      </p>
                      <p
                        className={`mt-2 text-sm ${isFailed ? 'text-red-700' : 'text-indigo-700'}`}
                      >
                        {data.judgeReasoning}
                      </p>
                    </div>
                  );
                })()}

              {/* Judge output */}
              {data.judgeResults.length !== 1 && data.judgeOutput && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-800">Judge Output</p>
                  <pre className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                    {data.judgeOutput}
                  </pre>
                </div>
              )}

              {/* Legacy single-judge audit */}
              {data.judgeResults.length === 0 &&
                (data.judgeSystemPrompt || data.judgeUserPrompt || data.judgeInputImages) && (
                  <div className="space-y-3">
                    {data.judgeTypeUsed && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                          Judge Mode
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            data.judgeTypeUsed === 'batch'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {data.judgeTypeUsed === 'batch'
                            ? 'Batch (all images in one request)'
                            : 'Individual (one image per request)'}
                        </span>
                      </div>
                    )}
                    {data.judgeSystemPrompt && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                          Judge System Prompt
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                          {data.judgeSystemPrompt}
                        </pre>
                      </div>
                    )}
                    {data.judgeUserPrompt && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                          Judge User Prompt
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                          {data.judgeUserPrompt}
                        </pre>
                      </div>
                    )}
                    {data.judgeInputImages && data.judgeInputImages.length > 0 && (
                      <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                          Judge Input Images ({data.judgeInputImages.length})
                        </p>
                        <AuditImageGrid images={data.judgeInputImages} />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </SectionToggle>
        )}

        {/* Step Results */}
        <SectionToggle
          title="Step Results"
          count={stepGroups.length}
          open={showSteps}
          onToggle={() => setShowSteps(!showSteps)}
        >
          <div className="space-y-3 p-4">
            {stepGroups.length === 0 && (
              <p className="text-sm text-gray-500">No step results yet.</p>
            )}
            {stepGroups.map((group, i) => (
              <StepGroupCard
                key={group.stepOrder}
                group={group}
                defaultOpen={stepGroups.length <= 3 || i === stepGroups.length - 1}
                onViewPrompt={handleViewPrompt}
              />
            ))}
          </div>
        </SectionToggle>
      </div>

      {/* ──── Modals ──── */}
      {showJudgeModal && (
        <ReasoningModal
          aggregateScore={data.judgeScore ?? 0}
          panels={buildPanels(data.judgeResults, {
            judgeReasoning: data.judgeReasoning,
            judgeOutput: data.judgeOutput,
            judgeSystemPrompt: data.judgeSystemPrompt,
            judgeUserPrompt: data.judgeUserPrompt,
            judgeTypeUsed: data.judgeTypeUsed,
            judgeScore: data.judgeScore,
          })}
          isSelected={data.isJudgeSelected}
          isFailed={data.judgeScore === 0}
          onClose={() => setShowJudgeModal(false)}
        />
      )}

      {viewingPromptId && (
        <ViewPromptModal
          promptVersionId={viewingPromptId}
          promptVersionName={viewingPromptName}
          processedSystemPrompt={viewingProcessedSystemPrompt}
          processedUserPrompt={viewingProcessedUserPrompt}
          onClose={() => {
            setViewingPromptId(null);
            setViewingPromptName(null);
            setViewingProcessedSystemPrompt(null);
            setViewingProcessedUserPrompt(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- tiny helpers ---------- */

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ConfigTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
      <span className="font-medium text-gray-500">{label}:</span>&nbsp;{value}
    </span>
  );
}
