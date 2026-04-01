'use client';

import { DesignSettingsDisplay, useCatalogProducts } from '@/components/design-settings-editor';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { withImageParams } from '@/lib/image-utils';
import {
  getInputPresetStoredImages,
  INPUT_PRESET_DESIGN_FIELD_KEYS,
  INPUT_PRESET_SLOT_LABELS,
  INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY,
  readInputPresetValue,
} from '@/lib/input-preset-design';
import type { InputPresetDetailItem } from '@/lib/service-client';
import { serviceUrl } from '@/lib/api-base';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { RatingBadge } from './rating-badge';

interface SerializedGeneration {
  id: string;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  createdAt: string;
  outputImageCount: number;
  promptVersionName: string | null;
}

interface Stats {
  generationCount: number;
  imageCount: number;
}

interface InputPresetDetailProps {
  data: InputPresetDetailItem;
  generations: SerializedGeneration[];
  stats: Stats;
}

interface LayoutPresetOption {
  id: string;
  name: string;
}

export function InputPresetDetail({ data, generations, stats }: InputPresetDetailProps) {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);
  const [layoutPresetOptions, setLayoutPresetOptions] = useState<LayoutPresetOption[]>([]);
  const rawData = data as unknown as Record<string, unknown>;
  const { byId, loaded } = useCatalogProducts();
  const storedImages = useMemo(() => getInputPresetStoredImages(rawData), [rawData]);
  const storedImagesBySlot = useMemo(
    () => new Map(storedImages.map((image) => [image.slot, image])),
    [storedImages]
  );
  const productCards = useMemo(() => {
    const imageTypeLabels: Record<string, string> = {
      'featured-image': 'Featured Image',
      'line-drawing': 'Line Drawing',
      'tear-sheet': 'Tear Sheet',
      arbitrary: 'Arbitrary',
    };

    return Object.keys(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY).flatMap((slot) => {
      const storedImage = storedImagesBySlot.get(slot) ?? null;
      const slotValue = readInputPresetValue(rawData, slot);
      const productId = typeof slotValue === 'string' && slotValue.length > 0 ? slotValue : null;

      if (!productId && !storedImage) return [];

      const product = productId ? byId.get(productId) ?? null : null;
      const imageTypeValue = readInputPresetValue(rawData, `${slot}ImageType`);
      const imageTypeLabel =
        typeof imageTypeValue === 'string' && imageTypeLabels[imageTypeValue]
          ? imageTypeLabels[imageTypeValue]
          : 'Tear Sheet';

      return [
        {
          slot,
          label: INPUT_PRESET_SLOT_LABELS[slot] ?? slot,
          previewUrl: storedImage?.url ?? product?.featuredImage?.url ?? null,
          title:
            product?.name ??
            (storedImage?.isArbitrary ? 'Arbitrary image' : productId ?? 'Saved image'),
          subtitle: product
            ? `${product.category?.name ?? 'Selected product'} · ${imageTypeLabel}`
            : storedImage?.isArbitrary
              ? `URL-only attachment · ${imageTypeLabel}`
              : imageTypeLabel,
          isLoadingPreview: !!productId && !product && !storedImage?.url && !loaded,
          url: storedImage?.url ?? null,
          isArbitrary: storedImage?.isArbitrary ?? false,
        },
      ];
    });
  }, [byId, loaded, rawData, storedImagesBySlot]);
  const layoutTypeId =
    data.layoutTypeId ?? (typeof rawData.layout_type_id === 'string' ? rawData.layout_type_id : null);
  const selectedLayoutPreset = useMemo(
    () => layoutPresetOptions.find((option) => option.id === layoutTypeId) ?? null,
    [layoutPresetOptions, layoutTypeId]
  );

  useEffect(() => {
    if (!layoutTypeId) return;

    let cancelled = false;

    fetch(serviceUrl('layout-presets'))
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to fetch presets (${res.status})`);
        const json = (await res.json()) as { data?: LayoutPresetOption[] };
        if (cancelled) return;
        setLayoutPresetOptions(Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => {
        if (!cancelled) setLayoutPresetOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [layoutTypeId]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/input-presets" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Input Presets
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {data.name || 'Untitled Input Preset'}
          </h1>
          {data.description && (
            <p className="mt-1 text-sm text-gray-600">{data.description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {data.deletedAt ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deleted
            </span>
          ) : (
            <>
              <Link
                href={`/input-presets/${data.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Edit
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setCloning(true);
                  try {
                    const res = await fetch(serviceUrl(`input-presets/${data.id}/clone`), { method: 'POST' });
                    if (!res.ok) throw new Error('Clone failed');
                    const json = await res.json();
                    const newId = json.data?.id;
                    if (newId) router.push(`/input-presets/${newId}/edit`);
                  } finally {
                    setCloning(false);
                  }
                }}
                disabled={cloning}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {cloning ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                )}
                {cloning ? 'Cloning...' : 'Clone'}
              </button>
              <Link
                href="/executions"
                className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                New Run
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Images</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.imageCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Generations</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.generationCount}</p>
        </div>
      </div>

      {layoutTypeId ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Room preset layout type</p>
          <p className="mt-1 text-sm text-gray-900">{selectedLayoutPreset?.name ?? layoutTypeId}</p>
        </div>
      ) : null}

      {/* Design settings (adapters_Design) */}
      {(() => {
        const entries = INPUT_PRESET_DESIGN_FIELD_KEYS.flatMap((key) => {
          const value = data[key];
          return value === undefined || value === null || value === '' ? [] : [[key, value] as const];
        });
        if (entries.length === 0) {
          return null;
        }
        return (
          <div className="mt-6">
            <DesignSettingsDisplay value={Object.fromEntries(entries)} hideProductFields />
          </div>
        );
      })()}

      {/* Scene Images */}
      {(() => {
        const scenes = [
          { label: 'Dollhouse View', url: data.dollhouseView },
          { label: 'Real Photo', url: data.realPhoto },
          { label: 'Mood Board', url: data.moodBoard },
        ].filter((s): s is { label: string; url: string } => !!s.url);
        if (scenes.length === 0) return null;
        return (
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Scene Images</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {scenes.map((s) => (
                <div key={s.label} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                  <div className="border-b border-gray-100 px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-gray-700">{s.label}</span>
                  </div>
                  <ImageWithSkeleton
                    src={withImageParams(s.url)}
                    alt={s.label}
                    loading="lazy"
                    wrapperClassName="h-48 w-full bg-gray-50 p-1"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Product Images */}
      {(() => {
        return productCards.length > 0 ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Product Images</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productCards.map((item, i: number) => (
              <div key={i} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                {item.previewUrl ? (
                  <ImageWithSkeleton
                    src={withImageParams(item.previewUrl)}
                    alt={item.label}
                    loading="lazy"
                    wrapperClassName="h-32 w-full bg-gray-50 p-1"
                  />
                ) : item.isLoadingPreview ? (
                  <div className="h-32 w-full animate-pulse bg-gray-200" aria-hidden />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gray-50 text-xs text-gray-400">
                    No preview
                  </div>
                )}
                <div className="border-t border-gray-100 px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-gray-700" title={item.label}>
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-gray-600" title={item.title}>
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-gray-500" title={item.subtitle}>
                    {item.subtitle}
                  </p>
                  {item.url ? (
                    <p className="truncate text-[11px] text-gray-500" title={item.url}>
                      {item.url}
                    </p>
                  ) : null}
                  {item.isArbitrary ? (
                    <span className="mt-1 inline-flex rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                      Arbitrary
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null;
      })()}

      {/* Generations List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            No generations yet using this input preset.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Prompt Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Outputs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Link href={`/generations/${gen.id}`}>
                        <div className="flex gap-1">
                          <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
                          <RatingBadge rating={gen.productAccuracyRating} label="Product" />
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {gen.promptVersionName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {gen.outputImageCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
