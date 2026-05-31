"use client";

import { useState } from "react";
import { ExpandableImage } from "@/components/expandable-image";
import { AuditCollapsible } from "./audit";
import type { Segmentation, SegmentationCategoryRow } from "./types";

/**
 * Human-friendly labels for the 23 product categories the backend may segment.
 * Falls back to a generic snake_case → Title Case transform for any new key
 * the backend might introduce later.
 */
const SEGMENTATION_CATEGORY_LABELS: Record<string, string> = {
  vanities: "Vanity",
  faucets: "Faucet",
  lightings: "Lighting",
  mirrors: "Mirror",
  shower_systems: "Shower system",
  floor_tiles: "Floor tile",
  lvps: "LVP",
  wall_tiles: "Wall tile",
  tubs: "Tub",
  tub_fillers: "Tub filler",
  tub_doors: "Tub door",
  shower_glasses: "Shower glass",
  shower_wall_tiles: "Shower wall tile",
  shower_floor_tiles: "Shower floor tile",
  shower_curb_tiles: "Shower curb tile",
  toilets: "Toilet",
  paints: "Paint",
  wallpapers: "Wallpaper",
  shelves: "Shelves",
  toilet_paper_holders: "Toilet paper holder",
  towel_bars: "Towel bar",
  robe_hooks: "Robe hook",
  towel_rings: "Towel ring"
};

function categoryLabel(category: string): string {
  return SEGMENTATION_CATEGORY_LABELS[category] ?? category.replaceAll("_", " ").replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function buildSegmentationRows(segmentation: Segmentation): SegmentationCategoryRow[] {
  const { results } = segmentation;
  if (!results || typeof results !== "object" || Array.isArray(results)) return [];
  return Object.entries(results)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([category, value]) => {
      const data = value ?? {};
      const masks = Array.isArray(data.masks) ? data.masks : [];
      const scores = Array.isArray(data.scores) ? data.scores : [];
      const numericScores = scores.filter((score): score is number => typeof score === "number");
      const composite = typeof data.image === "string" && data.image.length > 0 ? data.image : null;
      return {
        category,
        label: categoryLabel(category),
        composite,
        maskCount: masks.length,
        topScore: numericScores.length > 0 ? Math.max(...numericScores) : null,
        raw: data
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function SegmentationPanel({ segmentation }: { segmentation: Segmentation }) {
  const [showRaw, setShowRaw] = useState(false);
  const rows = buildSegmentationRows(segmentation);

  if (rows.length === 0) return null;

  const totalMasks = rows.reduce((sum, row) => sum + row.maskCount, 0);

  return (
    <AuditCollapsible title={`Segmentation · ${rows.length} ${rows.length === 1 ? "category" : "categories"} · ${totalMasks} ${totalMasks === 1 ? "mask" : "masks"}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {rows.map((row) => (
            <div key={row.category} className="border-border bg-surface-muted rounded-md border p-2">
              <div className="flex items-baseline justify-between gap-1">
                <p className="text-text-secondary truncate text-[11px] font-semibold" title={row.label}>
                  {row.label}
                </p>
                {row.topScore !== null && <span className="bg-surface text-text-secondary ring-border shrink-0 rounded px-1 py-px text-[10px] tabular-nums ring-1">{row.topScore.toFixed(2)}</span>}
              </div>
              <p className="text-text-muted mt-0.5 text-[10px]">
                {row.maskCount} {row.maskCount === 1 ? "mask" : "masks"}
              </p>
              {row.composite ? (
                <ExpandableImage
                  src={row.composite}
                  alt={`${row.label} segmentation overlay`}
                  wrapperClassName="relative mt-2 block aspect-square w-full overflow-hidden rounded border border-border bg-surface"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="border-border bg-surface mt-2 flex aspect-square w-full items-center justify-center rounded border border-dashed">
                  <p className="text-text-disabled px-2 text-center text-[10px] italic">{row.maskCount === 0 ? "No masks detected" : "No overlay returned"}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-text-disabled flex items-center gap-3 text-[10px]">
          <span>
            Result {segmentation.generationResultId.slice(0, 8)}… · {new Date(segmentation.createdAt).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => {
              setShowRaw((prev) => !prev);
            }}
            className="text-text-muted hover:text-text-secondary underline"
          >
            {showRaw ? "Hide" : "Show"} raw JSON
          </button>
        </div>
        {showRaw && <pre className="border-border bg-surface text-text-secondary max-h-72 overflow-auto rounded-md border p-2 text-[10px] leading-snug">{JSON.stringify(segmentation.results, null, 2)}</pre>}
      </div>
    </AuditCollapsible>
  );
}
