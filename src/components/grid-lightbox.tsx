'use client';

import { RatingForm } from '@/app/generations/[id]/rating-form';
import { ComparisonSlider } from '@/components/comparison-slider';
import { ImageEvaluationForm } from '@/components/image-evaluation-form';
import { getActiveProductCategories, getProductImagesFromInput } from '@/lib/generation-utils';
import { withImageParams } from '@/lib/image-utils';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface GridLightboxProps {
  src: string;
  runHref: string;
  /** When set, the generation result can be rated and evaluated (scene/product issues) in the modal. */
  generationId?: string | null;
  onRated?: () => void;
  onClose: () => void;
}

interface GenerationData {
  scene_accuracy_rating: string | null;
  product_accuracy_rating: string | null;
  results: { id: string; url: string }[];
  input: Record<string, unknown> | null;
}

export function GridLightbox({
  src,
  runHref,
  generationId,
  onRated,
  onClose,
}: GridLightboxProps) {
  const [generation, setGeneration] = useState<GenerationData | null>(null);
  /** Which scene to compare (0/1/2 = Dollhouse/Real Photo/Mood Board). null = output only. */
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  /** 0–100: position of the comparison bar (left % shows scene, right % shows output). */
  const [comparisonPosition, setComparisonPosition] = useState(50);
  /** When set, show a simple overlay with the full image. */
  const [expandedImage, setExpandedImage] = useState<{ src: string; alt: string } | null>(null);

  const fetchGeneration = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/generations/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data ?? json;
      const results = Array.isArray(data.results) ? data.results : [];
      setGeneration({
        scene_accuracy_rating: data.scene_accuracy_rating ?? null,
        product_accuracy_rating: data.product_accuracy_rating ?? null,
        results: results.map((r: { id: string; url?: string }) => ({ id: r.id, url: r.url ?? '' })),
        input: data.input ?? null,
      });
    } catch {
      setGeneration(null);
    }
  }, []);

  useEffect(() => {
    if (generationId) fetchGeneration(generationId);
    else setGeneration(null);
  }, [generationId, fetchGeneration]);

  const handleRated = useCallback(() => {
    if (generationId) fetchGeneration(generationId);
    onRated?.();
  }, [generationId, fetchGeneration, onRated]);

  const productCategories = useMemo(
    () => getActiveProductCategories(generation?.input ?? null),
    [generation?.input],
  );

  const productImages = useMemo(
    () => getProductImagesFromInput(generation?.input ?? null),
    [generation?.input],
  );

  const sceneImages = useMemo(() => {
    const input = generation?.input;
    if (!input) return [];
    const entries: { label: string; url: string }[] = [];
    if (typeof input.dollhouseView === 'string' && input.dollhouseView) entries.push({ label: 'Dollhouse', url: input.dollhouseView });
    if (typeof input.realPhoto === 'string' && input.realPhoto) entries.push({ label: 'Real Photo', url: input.realPhoto });
    if (typeof input.moodBoard === 'string' && input.moodBoard) entries.push({ label: 'Mood Board', url: input.moodBoard });
    return entries;
  }, [generation?.input]);

  /** Output image URL for this modal (the one that was clicked). Never changes when switching scene comparison. */
  const outputUrl = useMemo(() => {
    const list = generation?.results ?? [];
    if (list.length === 0) return src;
    const idx = list.findIndex((r) => r.url === src);
    return idx >= 0 ? list[idx].url : list[0]?.url ?? src;
  }, [generation?.results, src]);

  /** Result ID for the evaluation form: always the output that was opened (matches src). */
  const initialResultId = useMemo(() => {
    if (!generation?.results?.length) return null;
    const idx = generation.results.findIndex((r) => r.url === src);
    const r = idx >= 0 ? generation.results[idx] : generation.results[0];
    return r?.id ?? null;
  }, [generation?.results, src]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedImage) setExpandedImage(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, expandedImage]);

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-[1200px] max-w-[95vw] max-h-[90vh] cursor-default flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href={runHref}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View run details &rarr;
            </Link>
            {selectedSceneIndex !== null && sceneImages[selectedSceneIndex] && (
              <span className="text-sm text-gray-500">
                Comparing with {sceneImages[selectedSceneIndex].label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                  onClick={(e) => { e.stopPropagation(); setExpandedImage({ src: outputUrl, alt: 'Output' }); }}
                  className="cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={outputUrl}
                    alt="Output"
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </button>
              )}
            </div>
            {sceneImages.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Compare with:</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sceneImages.map((img, i) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSceneIndex(selectedSceneIndex === i ? null : i);
                      }}
                      className={`shrink-0 flex flex-col items-center gap-0.5 rounded border-2 overflow-hidden ${selectedSceneIndex === i ? 'border-primary-500 ring-1 ring-primary-500' : 'border-transparent hover:border-gray-300'}`}
                      title={selectedSceneIndex === i ? 'Click to disable compare' : 'Click to compare with scene reference'}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImage({ src: img.url, alt: img.label });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedImage({ src: img.url, alt: img.label });
                          }
                        }}
                        className="block cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.label} className="h-14 w-14 object-cover" />
                      </span>
                      <span className="text-[10px] font-medium text-gray-500 max-w-[4rem] truncate">{img.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {generationId && (
            <>
              <div className="mt-6 grid grid-cols-1 gap-6 border-t border-gray-200 pt-6 lg:grid-cols-2">
                {initialResultId && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">Scene & product issues</p>
                    <ImageEvaluationForm resultId={initialResultId} productCategories={productCategories} />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">Rate generation</p>
                  {generation ? (
                    <RatingForm
                      generationId={generationId}
                      currentSceneAccuracyRating={generation.scene_accuracy_rating}
                      currentProductAccuracyRating={generation.product_accuracy_rating}
                      onRated={handleRated}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">Loading…</p>
                  )}
                </div>
              </div>
              {productImages.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <p className="mb-3 text-sm font-medium text-gray-700">Product images used</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {productImages.map((img) => (
                      <div
                        key={img.key}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                      >
                        {img.urls.length === 1 ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedImage({ src: img.urls[0], alt: img.label }); }}
                            className="block h-24 w-full cursor-zoom-in"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={withImageParams(img.urls[0], 256)}
                              alt={img.label}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-0.5 p-0.5">
                            {img.urls.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setExpandedImage({ src: url, alt: `${img.label} ${i + 1}` }); }}
                                className="cursor-zoom-in"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={withImageParams(url, 128)}
                                  alt={`${img.label} ${i + 1}`}
                                  className="h-14 w-full rounded object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="p-1.5">
                          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            {img.label}
                            {img.urls.length > 1 && ` (${img.urls.length})`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {expandedImage && (
      <div
        className="fixed inset-0 z-[10000] flex cursor-pointer items-center justify-center bg-black/80 p-6"
        onClick={() => setExpandedImage(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Expanded image"
      >
        <div
          className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="max-h-[90vh] max-w-full object-contain"
          />
          <div className="absolute left-0 right-0 top-0 rounded-t-lg bg-gradient-to-b from-black/60 to-transparent px-3 py-2">
            <span className="text-sm font-medium text-white">{expandedImage.alt}</span>
          </div>
          <button
            type="button"
            onClick={() => setExpandedImage(null)}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )}
    </>,
    document.body,
  );
}
