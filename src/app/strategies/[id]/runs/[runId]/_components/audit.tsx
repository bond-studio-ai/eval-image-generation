'use client';

import { useState } from 'react';
import { CdnImage } from '@/components/cdn-image';
import { ExpandableImage } from '@/components/expandable-image';
import { ChevronIcon } from './shared';
import type { InputImage, StepResult } from './types';

const CONFIG_LABELS: Record<string, string> = {
  model: 'Model',
  aspect_ratio: 'Aspect Ratio',
  output_resolution: 'Resolution',
  temperature: 'Temperature',
  use_google_search: 'Google Search',
  tag_images: 'Tag Images',
};

export function AuditImageGrid({ images }: { images: InputImage[] }) {
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {images.map((img, i) => (
          <div key={img.url} className="group relative">
            {img.isComposite ? (
              <button
                type="button"
                className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-md border border-violet-400 bg-gray-50 ring-1 ring-violet-200"
                onClick={() => setExpandedGroup(expandedGroup === i ? null : i)}
              >
                <CdnImage
                  src={img.url}
                  alt={img.label}
                  fill
                  sizes="(max-width:768px) 25vw, 200px"
                  className="object-cover"
                />
              </button>
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
                type="button"
                onClick={() => setExpandedGroup(null)}
                className="text-xs text-violet-600 hover:text-violet-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {images[expandedGroup].sourceImages!.map((src) => (
                <div key={src.url}>
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

export function AuditCollapsible({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-gray-500 hover:bg-gray-50"
      >
        <ChevronIcon open={open} className="size-3" />
        {title}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function StepAudit({ sr }: { sr: StepResult }) {
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
