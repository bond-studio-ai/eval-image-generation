"use client";

import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { ImageIcon, XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

interface GenerationThumbnailsProps {
  urls: string[];
}

function ThumbnailImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="border-border relative size-12 shrink-0 overflow-hidden rounded border">
      {!loaded && <div className="bg-border absolute inset-0 animate-pulse" />}
      <CdnImage src={url} alt={alt} width={48} height={48} onLoad={() => setLoaded(true)} className={`object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}

function LightboxImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="bg-surface-sunken relative w-full overflow-hidden rounded-lg">
      {/* Skeleton placeholder — maintains a 4:3 aspect ratio until image loads */}
      {!loaded && <div className="bg-border aspect-[4/3] w-full animate-pulse" />}
      <CdnImage src={url} alt={alt} width={0} height={0} sizes="100vw" onLoad={() => setLoaded(true)} className={`h-auto w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "absolute inset-0 opacity-0"}`} />
    </div>
  );
}

export function GenerationThumbnails({ urls }: GenerationThumbnailsProps) {
  const [expanded, setExpanded] = useState(false);

  if (urls.length === 0) {
    return (
      <div className="border-border bg-surface-muted flex size-12 items-center justify-center rounded border">
        <ImageIcon className="text-text-disabled size-4" />
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail(s) with loading skeleton */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setExpanded(true);
        }}
        className="flex cursor-pointer items-center gap-1.5"
      >
        {urls.slice(0, 2).map((url, i) => (
          <ThumbnailImage key={url} url={url} alt={`Result ${i + 1}`} />
        ))}
        {urls.length > 2 && <span className="border-border bg-surface-muted text-text-muted text-caption flex size-12 shrink-0 items-center justify-center rounded border font-medium">+{urls.length - 2}</span>}
      </button>

      {/* Lightbox — full-width modal with skeleton loading */}
      {expanded && (
        <Modal
          onClose={() => setExpanded(false)}
          ariaLabel="Expanded results"
          backdropClassName="bg-overlay/70"
          containerClassName="sm:p-6"
          className="bg-surface relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
            <span className="text-text-secondary text-body font-medium">
              {urls.length} result{urls.length !== 1 ? "s" : ""}
            </span>
            <button type="button" aria-label="Close" onClick={() => setExpanded(false)} className="bg-surface-sunken text-text-secondary hover:bg-border rounded-full p-1.5">
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Image grid */}
          <div className="flex-1 overflow-auto p-4">
            <div className={`grid gap-4 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
              {urls.map((url, i) => (
                <LightboxImage key={url} url={url} alt={`Result ${i + 1}`} />
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
