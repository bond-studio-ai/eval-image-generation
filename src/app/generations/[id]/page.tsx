import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { ExpandableImage } from '@/components/expandable-image';
import { ImageEvaluationForm } from '@/components/image-evaluation-form';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { generation } from '@/db/schema';
import { toUrlArray, withImageParams } from '@/lib/image-utils';
import { CATEGORY_LABELS } from '@/lib/validation';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RatingForm } from './rating-form';
import { SectionNav } from './section-nav';

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
      const urls = toUrlArray((inputData as Record<string, unknown>)[camelKey]);
      if (urls.length > 0) activeProductCategories.push(snakeKey);
    }
  }

  const productImages: { key: string; label: string; urls: string[] }[] = [];
  if (inputData) {
    for (const { camelKey, snakeKey } of PRODUCT_COLUMN_KEYS) {
      const urls = toUrlArray((inputData as Record<string, unknown>)[camelKey]);
      if (urls.length > 0) {
        productImages.push({
          key: snakeKey,
          label: CATEGORY_LABELS[snakeKey] ?? snakeKey,
          urls,
        });
      }
    }
  }

  const hasNotes = !!result.notes;
  const hasSceneImages = !!(inputData && (inputData.dollhouseView || inputData.realPhoto || inputData.moodBoard));
  const hasProductImages = productImages.length > 0;

  const navSections: { id: string; label: string; icon: React.ReactNode }[] = [
    {
      id: 'section-rating',
      label: 'Rating',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
    },
    {
      id: 'section-output',
      label: 'Output Images',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>,
    },
    {
      id: 'section-meta',
      label: 'Info',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
    },
    ...(hasNotes ? [{
      id: 'section-notes',
      label: 'Notes',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    }] : []),
    ...(hasSceneImages ? [{
      id: 'section-scene',
      label: 'Scene Images',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm14.25-11.25h.008v.008h-.008v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>,
    }] : []),
    ...(hasProductImages ? [{
      id: 'section-products',
      label: 'Product Images',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    }] : []),
    {
      id: 'section-prompts',
      label: 'Prompts',
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    },
  ];

  return (
    <div>
      <SectionNav sections={navSections} />

      <Link href="/executions?tab=generations" className="text-sm text-gray-600 hover:text-gray-900">
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
      <div id="section-rating" className="mt-6 scroll-mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
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
      <div id="section-output" className="mt-8 scroll-mt-6">
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
                    <ExpandableImage
                      src={img.url}
                      alt={`Output image ${idx + 1}`}
                      wrapperClassName="relative block h-80 min-h-[20rem] w-full bg-gray-50"
                    />
                    <div className="border-t border-gray-200 p-2">
                      <p className="min-w-0 truncate text-xs text-gray-600">{img.url}</p>
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
      <div id="section-meta" className="mt-8 scroll-mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div id="section-notes" className="mt-6 scroll-mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">Notes</h2>
          <p className="mt-2 text-sm text-gray-700">{result.notes}</p>
        </div>
      )}

      {/* Scene Images */}
      {inputData && (inputData.dollhouseView || inputData.realPhoto || inputData.moodBoard) && (
        <div id="section-scene" className="mt-8 scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Scene Images</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {inputData.dollhouseView && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <ImageWithSkeleton
                  src={withImageParams(inputData.dollhouseView)}
                  alt="Dollhouse View"
                  loading="lazy"
                  wrapperClassName="h-56 w-full bg-gray-50"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-600">Dollhouse View</p>
                </div>
              </div>
            )}
            {inputData.realPhoto && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <ImageWithSkeleton
                  src={withImageParams(inputData.realPhoto)}
                  alt="Real Photo"
                  loading="lazy"
                  wrapperClassName="h-56 w-full bg-gray-50"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-600">Real Photo</p>
                </div>
              </div>
            )}
            {inputData.moodBoard && (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
                <ImageWithSkeleton
                  src={withImageParams(inputData.moodBoard)}
                  alt="Mood Board"
                  loading="lazy"
                  wrapperClassName="h-56 w-full bg-gray-50"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-600">Mood Board</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Images */}
      {productImages.length > 0 && (
        <div id="section-products" className="mt-8 scroll-mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Product Images</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productImages.map((img) => (
              <div
                key={img.key}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                {img.urls.length === 1 ? (
                  <ImageWithSkeleton
                    src={withImageParams(img.urls[0])}
                    alt={img.label}
                    loading="lazy"
                    wrapperClassName="h-44 w-full bg-gray-50"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-0.5 p-1">
                    {img.urls.map((url, i) => (
                      <ImageWithSkeleton
                        key={i}
                        src={withImageParams(url)}
                        alt={`${img.label} ${i + 1}`}
                        loading="lazy"
                        wrapperClassName="h-20 w-full rounded bg-gray-50"
                      />
                    ))}
                  </div>
                )}
                <div className="p-2">
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {img.label}
                    {img.urls.length > 1 && ` (${img.urls.length})`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompts Used */}
      <div id="section-prompts" className="mt-8 scroll-mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
