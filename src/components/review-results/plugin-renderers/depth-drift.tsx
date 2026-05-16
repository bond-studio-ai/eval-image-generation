'use client';

import { useState } from 'react';
import { formatInt, formatNumber, formatPercent } from '../format';
import { ChevronIcon } from '../icons';
import type { DepthAssessment } from '../types';
import type { PluginRendererProps } from './index';

/**
 * Depth drift plugin renderer. Displays the alignment-corrected
 * monocular depth metrics (AbsRel / RMSE / δ<1.25 / Spearman) plus
 * the predicted vs. dollhouse depth thumbnails so reviewers can
 * eyeball the agreement between Depth Anything v2 and the dollhouse
 * EXR ground truth.
 *
 * Mirrors the visual idiom of `CollapsibleDrift` (collapsible card
 * with a chevron header showing the headline metric) so the modal's
 * plugin sections all look the same. The renderer narrows the
 * `unknown` payload to its own typed shape via a defensive cast so
 * malformed envelopes show "unavailable" instead of crashing the
 * modal.
 */
export function DepthDriftRenderer({ assessment }: PluginRendererProps) {
  const [open, setOpen] = useState(false);
  const depth = (assessment as DepthAssessment | null | undefined) ?? null;
  const metrics = depth?.metrics ?? null;
  const computed = depth !== null && depth.absenceReason === undefined;

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
          <span className="text-xs font-semibold tracking-wide text-gray-700 uppercase">Depth drift</span>
          {computed && depth && (
            <span className="text-[11px] font-normal text-gray-500">
              {depth.width}×{depth.height}
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums">
          {computed && metrics?.absRel !== null && metrics?.absRel !== undefined ? (
            <span className="text-gray-700">
              <span className="font-semibold">{formatNumber(metrics.absRel, 3)}</span>{' '}
              <span className="text-gray-500">AbsRel</span>
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
              {depth?.absenceReason === 'too_few_valid_pixels'
                ? 'Not enough overlapping valid pixels to fit the affine alignment.'
                : 'Depth assessment is not available for this row.'}
            </div>
          )}
          {depth && (
            <DepthMetricsCard depth={depth} />
          )}
          {depth && (depth.predictedDepthUrl || depth.dollhouseDepthUrl) && (
            <DepthThumbnails predictedUrl={depth.predictedDepthUrl} dollhouseUrl={depth.dollhouseDepthUrl} />
          )}
        </div>
      )}
    </div>
  );
}

function DepthMetricsCard({ depth }: { depth: DepthAssessment }) {
  const metrics = depth.metrics;
  const alignment = depth.alignment;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <Metric label="AbsRel" value={formatNumber(metrics?.absRel, 3)} hint="Mean absolute relative error after affine fit." />
        <Metric label="RMSE" value={formatNumber(metrics?.rmse, 3)} hint="Root mean squared error after affine fit." />
        <Metric label="δ<1.25" value={formatPercent(metrics?.delta1, 1)} hint="Fraction of pixels within 1.25× of truth." />
        <Metric label="Spearman" value={formatNumber(metrics?.spearman, 3)} hint="Rank correlation; alignment-free." />
      </dl>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <Metric label="Valid pixels" value={formatInt(depth.validPixels)} hint="Pixels valid in both depth maps." />
        <Metric
          label="Scale"
          value={formatNumber(alignment?.scale, 3)}
          hint="Affine fit scale (predicted → truth)."
        />
        <Metric
          label="Shift"
          value={formatNumber(alignment?.shift, 3)}
          hint="Affine fit shift (predicted → truth)."
        />
        <Metric
          label="Resolution"
          value={`${depth.width}×${depth.height}`}
          hint="Dollhouse EXR resolution; metrics computed in this grid."
        />
      </dl>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500" title={hint}>
        {label}
      </dt>
      <dd className="font-mono tabular-nums text-gray-800">{value}</dd>
    </div>
  );
}

function DepthThumbnails({ predictedUrl, dollhouseUrl }: { predictedUrl?: string; dollhouseUrl?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <DepthThumbnail label="Predicted (Depth Anything v2)" url={predictedUrl ?? null} />
      <DepthThumbnail label="Dollhouse (ground truth)" url={dollhouseUrl ?? null} />
    </div>
  );
}

function DepthThumbnail({ label, url }: { label: string; url: string | null }) {
  return (
    <figure className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
      <figcaption className="border-b border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
        {label}
      </figcaption>
      <div className="flex aspect-[4/3] items-center justify-center bg-gray-50">
        {url ? (
          // EXR thumbnails are .exr files which the browser can't render
          // directly — only the predicted PNG actually loads. The dollhouse
          // tile falls back to a "no preview" hint when the URL points at
          // an EXR. Either way the URL is a stable link reviewers can copy.
          /\.exr(\?|$)/i.test(url) ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-[11px] text-gray-500 underline hover:text-gray-700"
            >
              EXR (open externally)
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-full w-full object-contain" />
          )
        ) : (
          <span className="text-[11px] text-gray-400">No preview</span>
        )}
      </div>
    </figure>
  );
}
