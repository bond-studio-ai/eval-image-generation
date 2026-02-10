import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { ImageEvaluationForm } from '@/components/image-evaluation-form';
import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { generation } from '@/db/schema';
import { withImageParams } from '@/lib/image-utils';
import { CATEGORY_LABELS } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RatingForm } from './rating-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** All product category DB column keys (camelCase) mapped to their snake_case labels */
const PRODUCT_COLUMN_KEYS: { camelKey: string; snakeKey: string }[] = [
  { camelKey: 'faucets', snakeKey: 'faucets' },
  { camelKey: 'lightings', snakeKey: 'lightings' },
  { camelKey: 'lvps', snakeKey: 'lvps' },
  { camelKey: 'mirrors', snakeKey: 'mirrors' },
  { camelKey: 'paints', snakeKey: 'paints' },
  { camelKey: 'robeHooks', snakeKey: 'robe_hooks' },
  { camelKey: 'shelves', snakeKey: 'shelves' },
  { camelKey: 'showerGlasses', snakeKey: 'shower_glasses' },
  { camelKey: 'showerSystems', snakeKey: 'shower_systems' },
  { camelKey: 'floorTiles', snakeKey: 'floor_tiles' },
  { camelKey: 'wallTiles', snakeKey: 'wall_tiles' },
  { camelKey: 'showerWallTiles', snakeKey: 'shower_wall_tiles' },
  { camelKey: 'showerFloorTiles', snakeKey: 'shower_floor_tiles' },
  { camelKey: 'showerCurbTiles', snakeKey: 'shower_curb_tiles' },
  { camelKey: 'toiletPaperHolders', snakeKey: 'toilet_paper_holders' },
  { camelKey: 'toilets', snakeKey: 'toilets' },
  { camelKey: 'towelBars', snakeKey: 'towel_bars' },
  { camelKey: 'towelRings', snakeKey: 'towel_rings' },
  { camelKey: 'tubDoors', snakeKey: 'tub_doors' },
  { camelKey: 'tubFillers', snakeKey: 'tub_fillers' },
  { camelKey: 'tubs', snakeKey: 'tubs' },
  { camelKey: 'vanities', snakeKey: 'vanities' },
  { camelKey: 'wallpapers', snakeKey: 'wallpapers' },
];

export default async function GenerationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.generation.findFirst({
    where: eq(generation.id, id),
    with: {
      promptVersion: true,
      input: true,
      results: true,
    },
  });

  if (!result) {
    notFound();
  }

  // Extract active product categories from input for evaluation form
  const inputData = result.input;
  const activeProductCategories: string[] = [];
  if (inputData) {
    for (const { camelKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
      const val = (inputData as Record<string, unknown>)[camelKey];
      if (val) activeProductCategories.push(snakeKey);
    }
  }

  // Product images with labels
  const productImages: { key: string; label: string; url: string }[] = [];
  if (inputData) {
    for (const { camelKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
      const val = (inputData as Record<string, unknown>)[camelKey] as string | null;
      if (val) {
        productImages.push({
          key: snakeKey,
          label: CATEGORY_LABELS[snakeKey] ?? snakeKey,
          url: val,
        });
      }
    }
  }

  return (
    <div>
      <Link href="/generations" className="text-sm text-gray-600 hover:text-gray-900">
        &larr; Back to Generations
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generation Detail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Prompt Version:{' '}
            <Link
              href={`/prompt-versions/${result.promptVersion.id}`}
              className="text-primary-600 hover:text-primary-500 inline-flex items-center gap-1"
            >
              {result.promptVersion.name || 'Untitled'}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RatingBadge rating={result.sceneAccuracyRating} label="Scene" />
          <RatingBadge rating={result.productAccuracyRating} label="Product" />
          <DeleteGenerationButton generationId={result.id} />
        </div>
      </div>

      {/* Rating */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900 uppercase">Rate this Generation</h2>
        <div className="mt-3">
          <RatingForm
            generationId={result.id}
            currentSceneAccuracyRating={result.sceneAccuracyRating}
            currentProductAccuracyRating={result.productAccuracyRating}
          />
        </div>
      </div>

      {/* Output Images with Evaluations */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Output Images</h2>
        {result.results.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No output images for this generation.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {result.results.map((img, idx) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Image */}
                  <div className="bg-gray-50">
                    <div className="flex min-h-[20rem] items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={`Output image ${idx + 1}`} loading="lazy" className="h-full w-full object-contain" />
                    </div>
                    <div className="border-t border-gray-200 p-2">
                      <p className="truncate text-xs text-gray-600">{img.url}</p>
                    </div>
                  </div>

                  {/* Evaluation Form */}
                  <div className="border-t border-gray-200 p-4 lg:border-t-0 lg:border-l">
                    <ImageEvaluationForm
                      resultId={img.id}
                      productCategories={activeProductCategories}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Created</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Execution Time</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {result.executionTime ? `${(result.executionTime / 1000).toFixed(1)}s` : 'Not recorded'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Results</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {result.results.length} output image{result.results.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Notes */}
      {result.notes && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">Notes</h2>
          <p className="mt-2 text-sm text-gray-700">{result.notes}</p>
        </div>
      )}

      {/* Scene Images */}
      {inputData && (inputData.dollhouseView || inputData.realPhoto) && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Scene Images</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {inputData.dollhouseView && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <div className="flex h-56 items-center justify-center bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withImageParams(inputData.dollhouseView)} alt="Dollhouse View" loading="lazy" className="h-full w-full object-contain" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-600">Dollhouse View</p>
                </div>
              </div>
            )}
            {inputData.realPhoto && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <div className="flex h-56 items-center justify-center bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withImageParams(inputData.realPhoto)} alt="Real Photo" loading="lazy" className="h-full w-full object-contain" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-600">Real Photo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Images */}
      {productImages.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Product Images</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productImages.map((img) => (
              <div
                key={img.key}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                <div className="flex h-44 items-center justify-center bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={withImageParams(img.url)} alt={img.label} loading="lazy" className="h-full w-full object-contain" />
                </div>
                <div className="p-2">
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {img.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompts Used */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">System Prompt</h2>
          <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">
            {result.promptVersion.systemPrompt}
          </pre>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">User Prompt</h2>
          <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">
            {result.promptVersion.userPrompt}
          </pre>
        </div>
      </div>
    </div>
  );
}
