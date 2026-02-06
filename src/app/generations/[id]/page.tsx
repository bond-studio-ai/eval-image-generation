import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { generation } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RatingForm } from './rating-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GenerationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.generation.findFirst({
    where: eq(generation.id, id),
    with: {
      promptVersion: true,
      inputImages: true,
      outputImages: true,
    },
  });

  if (!result) {
    notFound();
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
        <RatingBadge rating={result.resultRating} />
      </div>

      {/* Meta */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Created</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Execution Time</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {result.executionTime ? `${result.executionTime}ms` : 'Not recorded'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Images</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {result.inputImages.length} input, {result.outputImages.length} output
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

      {/* Rating */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900 uppercase">Rate this Generation</h2>
        <div className="mt-3">
          <RatingForm generationId={result.id} currentRating={result.resultRating} />
        </div>
      </div>

      {/* Input Images */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Input Images</h2>
        {result.inputImages.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No input images for this generation.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.inputImages.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                <div className="aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="Input image" className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-gray-600">{img.url}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Images */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Output Images</h2>
        {result.outputImages.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No output images for this generation.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.outputImages.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs"
              >
                <div className="aspect-square bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="Output image" className="h-full w-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="truncate text-xs text-gray-600">{img.url}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
