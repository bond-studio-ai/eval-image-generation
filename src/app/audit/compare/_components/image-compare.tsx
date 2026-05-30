import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import type { InputImage } from "./types";

export function ImageCompare({ left, right }: { left: InputImage[] | null; right: InputImage[] | null }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const leftImgs = left ?? [];
  const rightImgs = right ?? [];
  const maxLen = Math.max(leftImgs.length, rightImgs.length);

  if (maxLen === 0) return <p className="text-text-disabled text-caption">No input images</p>;

  const leftByLabel = new Map(leftImgs.map((img) => [img.label, img]));
  const rightByLabel = new Map(rightImgs.map((img) => [img.label, img]));
  const allLabels = [...new Set([...leftImgs.map((i) => i.label), ...rightImgs.map((i) => i.label)])];

  return (
    <div className="space-y-2">
      {allLabels.map((label) => {
        const lImg = leftByLabel.get(label);
        const rImg = rightByLabel.get(label);
        const same = lImg?.url === rImg?.url;
        const isComposite = lImg?.isComposite || rImg?.isComposite;
        const sourceImages = lImg?.sourceImages ?? rImg?.sourceImages;
        return (
          <div key={label}>
            <div
              className={`flex items-start gap-3 rounded-lg p-2 ${same ? "bg-surface-muted" : "bg-warning-50 ring-warning-200 ring-1"} ${isComposite ? "cursor-pointer" : ""}`}
              {...(isComposite ? { onClick: () => setExpandedGroup(expandedGroup === label ? null : label) } : {})}
            >
              <div className="w-28 shrink-0 pt-1">
                <p className="text-text-muted text-[10px] font-medium">{label}</p>
                {isComposite && <span className="bg-accent-100 text-accent-700 mt-0.5 inline-flex items-center rounded px-1 py-px text-[9px] font-semibold">Group</span>}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div className={`bg-surface-sunken relative aspect-square w-20 overflow-hidden rounded-md border ${isComposite ? "border-accent-400" : "border-border"}`}>
                  {lImg?.url ? <CdnImage src={lImg.url} alt={label} fill sizes="80px" className="object-cover" /> : <div className="text-text-disabled flex h-full items-center justify-center text-[10px]">N/A</div>}
                </div>
                <div className={`bg-surface-sunken relative aspect-square w-20 overflow-hidden rounded-md border ${isComposite ? "border-accent-400" : "border-border"}`}>
                  {rImg?.url ? <CdnImage src={rImg.url} alt={label} fill sizes="80px" className="object-cover" /> : <div className="text-text-disabled flex h-full items-center justify-center text-[10px]">N/A</div>}
                </div>
              </div>
              {!same && <span className="bg-warning-100 text-warning-700 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">Changed</span>}
            </div>

            {expandedGroup === label && sourceImages && (
              <div className="border-accent-200 bg-accent-50 mt-1 ml-[7.5rem] rounded-lg border p-3">
                <p className="text-accent-800 text-caption mb-2 font-semibold">{sourceImages.length} source images</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sourceImages.map((src) => (
                    <div key={src.url}>
                      <div className="border-accent-200 bg-surface relative aspect-square overflow-hidden rounded-md border">
                        <CdnImage src={src.url} alt={src.label} fill sizes="(max-width:768px) 25vw, 96px" className="object-cover" />
                      </div>
                      <p className="text-accent-700 mt-0.5 truncate text-[10px]" title={src.label}>
                        {src.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
