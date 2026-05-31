"use client";

import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { formatInt, formatNumber, formatPercent } from "../format";
import { ChevronIcon } from "../icons";
import type { DepthAssessment } from "../types";
import type { PluginRendererProps } from "./index";

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
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        className="border-border bg-surface-muted hover:border-border-strong hover:bg-surface-sunken flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors"
      >
        <span className="flex items-center gap-2">
          <ChevronIcon className={`text-text-muted h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="text-text-secondary text-caption font-semibold tracking-wide uppercase">Depth drift</span>
          {computed && depth && (
            <span className="text-text-muted text-[11px] font-normal">
              {depth.width}×{depth.height}
            </span>
          )}
        </span>
        <span className="text-[11px] tabular-nums">
          {computed && metrics?.absRel !== null && metrics?.absRel !== undefined ? (
            <span className="text-text-secondary">
              <span className="font-semibold">{formatNumber(metrics.absRel, 3)}</span> <span className="text-text-muted">AbsRel</span>
            </span>
          ) : (
            <span className="text-text-muted">unavailable</span>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {!computed && (
            <div className="border-warning-200 bg-warning-50 text-warning-800 rounded-md border px-3 py-2 text-[11px]">
              {depth?.absenceReason === "too_few_valid_pixels" ? "Not enough overlapping valid pixels to fit the affine alignment." : "Depth assessment is not available for this row."}
            </div>
          )}
          {depth && <DepthMetricsCard depth={depth} />}
          {depth && (depth.predictedDepthUrl || depth.dollhouseDepthUrl) && <DepthThumbnails predictedUrl={depth.predictedDepthUrl} dollhouseUrl={depth.dollhouseDepthUrl} />}
        </div>
      )}
    </div>
  );
}

function DepthMetricsCard({ depth }: { depth: DepthAssessment }) {
  const { metrics, alignment, validPixels, width, height } = depth;
  return (
    <div className="border-border bg-surface rounded-md border px-3 py-2.5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <Metric label="AbsRel" value={formatNumber(metrics?.absRel, 3)} hint="Mean absolute relative error after affine fit." />
        <Metric label="RMSE" value={formatNumber(metrics?.rmse, 3)} hint="Root mean squared error after affine fit." />
        <Metric label="δ<1.25" value={formatPercent(metrics?.delta1, 1)} hint="Fraction of pixels within 1.25× of truth." />
        <Metric label="Spearman" value={formatNumber(metrics?.spearman, 3)} hint="Rank correlation; alignment-free." />
      </dl>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <Metric label="Valid pixels" value={formatInt(validPixels)} hint="Pixels valid in both depth maps." />
        <Metric label="Scale" value={formatNumber(alignment?.scale, 3)} hint="Affine fit scale (predicted → truth)." />
        <Metric label="Shift" value={formatNumber(alignment?.shift, 3)} hint="Affine fit shift (predicted → truth)." />
        <Metric label="Resolution" value={`${width}×${height}`} hint="Dollhouse EXR resolution; metrics computed in this grid." />
      </dl>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <dt className="text-text-muted font-medium" title={hint}>
        {label}
      </dt>
      <dd className="text-text-secondary font-mono tabular-nums">{value}</dd>
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
  // EXR thumbnails are .exr files which the browser can't render directly —
  // only the predicted PNG actually loads. When the URL points at an EXR we
  // show an external link instead. Either way the URL is a stable link
  // reviewers can copy.
  const isExr = !!url && /\.exr(?:\?|$)/i.test(url);
  return (
    <figure className="border-border bg-surface-muted overflow-hidden rounded-md border">
      <figcaption className="border-border bg-surface-sunken text-text-secondary border-b px-2 py-1 text-[10px] font-medium tracking-wide uppercase">{label}</figcaption>
      <div className="bg-surface-muted relative flex aspect-[4/3] items-center justify-center">
        {url ? null : <span className="text-text-disabled text-[11px]">No preview</span>}
        {url && isExr ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-text-muted hover:text-text-secondary px-3 py-2 text-[11px] underline">
            EXR (open externally)
          </a>
        ) : null}
        {url && !isExr ? <CdnImage src={url} alt={label} fill sizes="(max-width:768px) 50vw, 320px" className="object-contain" /> : null}
      </div>
    </figure>
  );
}
