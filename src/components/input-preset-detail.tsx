'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { withImageParams } from '@/lib/image-utils';
import { CATEGORY_LABELS } from '@/lib/validation';
import Link from 'next/link';
import { RatingBadge } from './rating-badge';

const CAMEL_TO_SNAKE: Record<string, string> = {
  robeHooks: 'robe_hooks',
  showerGlasses: 'shower_glasses',
  showerSystems: 'shower_systems',
  floorTiles: 'floor_tiles',
  wallTiles: 'wall_tiles',
  showerWallTiles: 'shower_wall_tiles',
  showerFloorTiles: 'shower_floor_tiles',
  showerCurbTiles: 'shower_curb_tiles',
  toiletPaperHolders: 'toilet_paper_holders',
  towelBars: 'towel_bars',
  towelRings: 'towel_rings',
  tubDoors: 'tub_doors',
  tubFillers: 'tub_fillers',
};

const PRODUCT_KEYS = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robeHooks',
  'shelves', 'showerGlasses', 'showerSystems', 'floorTiles', 'wallTiles',
  'showerWallTiles', 'showerFloorTiles', 'showerCurbTiles',
  'toiletPaperHolders', 'toilets', 'towelBars', 'towelRings',
  'tubDoors', 'tubFillers', 'tubs', 'vanities', 'wallpapers',
];

interface InputPresetData {
  id: string;
  name: string | null;
  description: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  deletedAt: string | null;
  [key: string]: unknown;
}

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
  data: InputPresetData;
  generations: SerializedGeneration[];
  stats: Stats;
}

export function InputPresetDetail({ data, generations, stats }: InputPresetDetailProps) {
  const productImages = PRODUCT_KEYS
    .map((k) => {
      const snakeKey = CAMEL_TO_SNAKE[k] ?? k;
      const url = data[k] as string | null;
      return url ? { key: snakeKey, label: CATEGORY_LABELS[snakeKey] ?? snakeKey, url } : null;
    })
    .filter(Boolean) as { key: string; label: string; url: string }[];

  const sceneImages = [
    { label: 'Dollhouse View', url: data.dollhouseView },
    { label: 'Real Photo', url: data.realPhoto },
    { label: 'Mood Board', url: data.moodBoard },
  ].filter((s) => s.url) as { label: string; url: string }[];

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

        <div className="flex shrink-0 items-center gap-3">
          {data.deletedAt ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deleted
            </span>
          ) : (
            <Link
              href={`/generate?input_preset_id=${data.id}`}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              Use in Generate
            </Link>
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

      {/* Scene Images */}
      {sceneImages.length > 0 && (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Scene Images</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {sceneImages.map((img) => (
              <div key={img.label}>
                <p className="mb-2 text-xs font-medium text-gray-600">{img.label}</p>
                <ImageWithSkeleton
                  src={withImageParams(img.url)}
                  alt={img.label}
                  loading="lazy"
                  wrapperClassName="h-56 w-full rounded-lg border border-gray-200 bg-gray-50"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Images */}
      {productImages.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Product Images</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productImages.map((img) => (
              <div key={img.key} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-100 px-2.5 py-1.5">
                  <span className="truncate text-xs font-semibold text-gray-700">{img.label}</span>
                </div>
                <ImageWithSkeleton
                  src={withImageParams(img.url)}
                  alt={img.label}
                  loading="lazy"
                  wrapperClassName="h-28 w-full bg-gray-50 p-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

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
