"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RatingForm } from "@/app/generations/[id]/rating-form";
import { CdnImage } from "@/components/cdn-image";
import { ComparisonSlider } from "@/components/comparison-slider";
import { ImageEvaluationForm } from "@/components/image-evaluation-form";
import { XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { serviceUrl } from "@/lib/api-base";
import { getActiveProductCategories, getProductImagesFromInput } from "@/lib/generation-utils";

interface GridLightboxProps {
  src: string;
  runHref: string;
  /** When set, the generation result can be rated and evaluated (scene/product issues) in the modal. */
  generationId?: string | null;
  onRated?: () => void;
  onClose: () => void;
}

interface GenerationData {
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  results: { id: string; url: string }[];
  input: Record<string, unknown> | null;
}

export function GridLightbox({ src, runHref, generationId, onRated, onClose }: GridLightboxProps) {
  // Tag fetched data with the id it belongs to so a `generationId` change
  // makes stale data disappear by derivation — no effect needed to clear it.
  const [fetched, setFetched] = useState<{ id: string; data: GenerationData } | null>(null);
  const generation = generationId && fetched?.id === generationId ? fetched.data : null;
  /** Which scene to compare (0/1/2 = Dollhouse/Real Photo/Mood Board). null = output only. */
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  /** 0–100: position of the comparison bar (left % shows scene, right % shows output). */
  const [comparisonPosition, setComparisonPosition] = useState(50);
  /** When set, show a simple overlay with the full image. */
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  const fetchGeneration = useCallback(async (id: string) => {
    try {
      const res = await fetch(serviceUrl(`generations/${id}`));
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      const results = Array.isArray(data.results) ? data.results : [];
      setFetched({
        id,
        data: {
          sceneAccuracyRating: data.sceneAccuracyRating ?? null,
          productAccuracyRating: data.productAccuracyRating ?? null,
          results: results.map((r: { id: string; url?: string }) => ({
            id: r.id,
            url: r.url ?? ""
          })),
          input: data.input ?? null
        }
      });
    } catch {
      setFetched(null);
    }
  }, []);

  useEffect(() => {
    if (generationId) fetchGeneration(generationId);
  }, [generationId, fetchGeneration]);

  const handleRated = useCallback(() => {
    if (generationId) fetchGeneration(generationId);
    onRated?.();
  }, [generationId, fetchGeneration, onRated]);

  const productCategories = useMemo(() => getActiveProductCategories(generation?.input ?? null), [generation?.input]);

  const productImages = useMemo(() => getProductImagesFromInput(generation?.input ?? null), [generation?.input]);

  const sceneImages = useMemo(() => {
    const input = generation?.input;
    if (!input) return [];
    const entries: { label: string; url: string }[] = [];
    if (typeof input.dollhouseView === "string" && input.dollhouseView) entries.push({ label: "Dollhouse", url: input.dollhouseView });
    if (typeof input.realPhoto === "string" && input.realPhoto) entries.push({ label: "Real Photo", url: input.realPhoto });
    if (typeof input.moodBoard === "string" && input.moodBoard) entries.push({ label: "Mood Board", url: input.moodBoard });
    return entries;
  }, [generation?.input]);

  /** Output image URL for this modal (the one that was clicked). Never changes when switching scene comparison. */
  const outputUrl = useMemo(() => {
    const list = generation?.results ?? [];
    if (list.length === 0) return src;
    const idx = list.findIndex((r) => r.url === src);
    return idx >= 0 ? list[idx].url : (list[0]?.url ?? src);
  }, [generation?.results, src]);

  /** Result ID for the evaluation form: always the output that was opened (matches src). */
  const initialResultId = useMemo(() => {
    if (!generation?.results?.length) return null;
    const idx = generation.results.findIndex((r) => r.url === src);
    const r = idx >= 0 ? generation.results[idx] : generation.results[0];
    return r?.id ?? null;
  }, [generation?.results, src]);

  return (
    <>
      <Modal
        onClose={() => {
          if (!expandedImage) onClose();
        }}
        ariaLabel="Generation result"
        backdropClassName="bg-overlay/80"
        containerClassName="z-[9999] p-6"
        className="bg-surface relative flex max-h-[90vh] w-[1200px] max-w-[95vw] flex-col overflow-hidden rounded-xl shadow-2xl"
      >
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href={runHref} className="text-primary-600 hover:text-primary-500 text-body font-medium">
              View run details &rarr;
            </Link>
            {selectedSceneIndex !== null && sceneImages[selectedSceneIndex] && <span className="text-text-muted text-body">Comparing with {sceneImages[selectedSceneIndex].label}</span>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="bg-surface-sunken text-text-secondary hover:bg-border rounded-full p-1.5">
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-8">
          <div className="relative flex flex-col items-center">
            {/* Fixed-size image area so switching between output-only and comparison doesn't resize */}
            <div className="flex h-[520px] w-full min-w-0 items-center justify-center rounded-lg bg-[#1a1a1a]">
              {selectedSceneIndex !== null && sceneImages[selectedSceneIndex] ? (
                <ComparisonSlider
                  leftImageUrl={sceneImages[selectedSceneIndex].url}
                  rightImageUrl={outputUrl}
                  position={comparisonPosition}
                  onPositionChange={setComparisonPosition}
                  leftImageAlt={sceneImages[selectedSceneIndex].label}
                  rightImageAlt="Output"
                  leftLabel={sceneImages[selectedSceneIndex].label}
                  rightLabel="Output"
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImage({ src: outputUrl, alt: "Output" });
                  }}
                  className="flex h-full min-h-0 w-full cursor-zoom-in items-center justify-center"
                >
                  <CdnImage src={outputUrl} alt="Output" width={0} height={0} sizes="100vw" className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain" />
                </button>
              )}
            </div>
            {sceneImages.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-text-muted text-caption font-medium">Compare with:</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sceneImages.map((img, i) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSceneIndex(selectedSceneIndex === i ? null : i);
                      }}
                      className={`flex shrink-0 flex-col items-center gap-0.5 overflow-hidden rounded border-2 ${selectedSceneIndex === i ? "border-primary-500 ring-primary-500 ring-1" : "hover:border-border-strong border-transparent"}`}
                      title={selectedSceneIndex === i ? "Click to disable compare" : "Click to compare with scene reference"}
                    >
                      <CdnImage src={img.url} alt={img.label} width={56} height={56} className="size-14 object-cover" />
                      <span className="text-text-muted max-w-[4rem] truncate text-[10px] font-medium">{img.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {generationId && (
            <>
              {productImages.length > 0 && (
                <div className="border-border mt-4 border-t pt-6">
                  <div className="flex flex-wrap gap-2">
                    {productImages.map((img) => (
                      <div key={img.key} className="border-border bg-surface flex flex-col items-center gap-1 rounded-lg border p-1.5">
                        {img.urls.length === 1 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedImage({ src: img.urls[0], alt: img.label });
                            }}
                            className="relative size-12 shrink-0 cursor-zoom-in overflow-hidden rounded"
                          >
                            <CdnImage src={img.urls[0]} alt={img.label} fill sizes="48px" className="object-cover" />
                          </button>
                        ) : (
                          <div className="flex gap-0.5">
                            {img.urls.map((url, i) => (
                              <button
                                key={url}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedImage({ src: url, alt: `${img.label} ${i + 1}` });
                                }}
                                className="relative size-10 shrink-0 cursor-zoom-in overflow-hidden rounded"
                              >
                                <CdnImage src={url} alt={`${img.label} ${i + 1}`} fill sizes="40px" className="object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-text-secondary max-w-[5rem] truncate text-center text-[10px] font-medium">
                          {img.label}
                          {img.urls.length > 1 && ` (${img.urls.length})`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="border-border mt-6 grid grid-cols-1 gap-6 border-t pt-6 lg:grid-cols-2">
                {initialResultId && (
                  <div>
                    <p className="text-text-secondary text-body mb-2 font-medium">Scene & product issues</p>
                    <ImageEvaluationForm resultId={initialResultId} productCategories={productCategories} />
                  </div>
                )}
                <div>
                  <p className="text-text-secondary text-body mb-2 font-medium">Rate generation</p>
                  {generation ? (
                    <RatingForm generationId={generationId} currentSceneAccuracyRating={generation.sceneAccuracyRating} currentProductAccuracyRating={generation.productAccuracyRating} onRated={handleRated} />
                  ) : (
                    <p className="text-text-muted text-body">Loading…</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {expandedImage && (
        <Modal
          onClose={() => setExpandedImage(null)}
          ariaLabel="Expanded image"
          backdropClassName="bg-overlay/80"
          containerClassName="z-[10000] p-6"
          className="relative max-h-[90vh] w-auto max-w-[90vw] overflow-hidden rounded-lg bg-transparent p-0 shadow-none"
        >
          <CdnImage src={expandedImage.src} alt={expandedImage.alt} width={0} height={0} sizes="100vw" className="h-auto max-h-[90vh] w-auto max-w-full object-contain" />
          <div className="from-overlay/60 absolute top-0 right-0 left-0 rounded-t-lg bg-gradient-to-b to-transparent px-3 py-2">
            <span className="text-text-inverse text-body font-medium">{expandedImage.alt}</span>
          </div>
          <button type="button" onClick={() => setExpandedImage(null)} className="text-text-inverse bg-overlay/50 hover:bg-overlay/70 absolute top-2 right-2 rounded-full p-1.5" aria-label="Close">
            <XIcon className="size-5" />
          </button>
        </Modal>
      )}
    </>
  );
}
