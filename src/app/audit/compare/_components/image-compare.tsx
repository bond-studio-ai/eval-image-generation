import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import type { InputImage } from "./types";

export function ImageCompare({ left, right }: { left: InputImage[] | null; right: InputImage[] | null }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const leftImgs = left ?? [];
  const rightImgs = right ?? [];
  const maxLen = Math.max(leftImgs.length, rightImgs.length);

  if (maxLen === 0) return <p className="text-xs text-gray-400">No input images</p>;

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
              className={`flex items-start gap-3 rounded-lg p-2 ${same ? "bg-gray-50" : "bg-amber-50 ring-1 ring-amber-200"} ${isComposite ? "cursor-pointer" : ""}`}
              {...(isComposite ? { onClick: () => setExpandedGroup(expandedGroup === label ? null : label) } : {})}
            >
              <div className="w-28 shrink-0 pt-1">
                <p className="text-[10px] font-medium text-gray-500">{label}</p>
                {isComposite && <span className="mt-0.5 inline-flex items-center rounded bg-violet-100 px-1 py-px text-[9px] font-semibold text-violet-700">Group</span>}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div className={`relative aspect-square w-20 overflow-hidden rounded-md border bg-gray-100 ${isComposite ? "border-violet-400" : "border-gray-200"}`}>
                  {lImg?.url ? <CdnImage src={lImg.url} alt={label} fill sizes="80px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-gray-400">N/A</div>}
                </div>
                <div className={`relative aspect-square w-20 overflow-hidden rounded-md border bg-gray-100 ${isComposite ? "border-violet-400" : "border-gray-200"}`}>
                  {rImg?.url ? <CdnImage src={rImg.url} alt={label} fill sizes="80px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-gray-400">N/A</div>}
                </div>
              </div>
              {!same && <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Changed</span>}
            </div>

            {expandedGroup === label && sourceImages && (
              <div className="mt-1 ml-[7.5rem] rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="mb-2 text-xs font-semibold text-violet-800">{sourceImages.length} source images</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {sourceImages.map((src) => (
                    <div key={src.url}>
                      <div className="relative aspect-square overflow-hidden rounded-md border border-violet-200 bg-white">
                        <CdnImage src={src.url} alt={src.label} fill sizes="(max-width:768px) 25vw, 96px" className="object-cover" />
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-violet-700" title={src.label}>
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
