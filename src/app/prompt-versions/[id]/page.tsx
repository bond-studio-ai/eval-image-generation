import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { promptVersion } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PromptVersionDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.promptVersion.findFirst({
    where: eq(promptVersion.id, id),
    with: {
      generations: {
        orderBy: (g, { desc }) => [desc(g.createdAt)],
        with: {
          inputImages: true,
          outputImages: true,
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const generations = result.generations;
  const rated = generations.filter((g) => g.resultRating !== null);
  const ratingMap: Record<string, number> = {
    FAILED: 0,
    POOR: 1,
    ACCEPTABLE: 2,
    GOOD: 3,
    EXCELLENT: 4,
  };

  const avgRating =
    rated.length > 0
      ? (
          rated.reduce((sum, g) => sum + (ratingMap[g.resultRating!] ?? 0), 0) / rated.length
        ).toFixed(2)
      : null;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/prompt-versions" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Prompt Versions
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {result.name || 'Untitled Prompt Version'}
          </h1>
          {result.description && <p className="mt-1 text-sm text-gray-500">{result.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {!result.deletedAt && (
            <Link
              href={`/prompt-versions/${id}/generate`}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              Generate Image
            </Link>
          )}
          {result.deletedAt && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
              Deleted
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm text-gray-500">Generations</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{generations.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm text-gray-500">Rated</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{rated.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm text-gray-500">Avg Rating</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{avgRating ?? '-'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm text-gray-500">Unrated</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {generations.length - rated.length}
          </p>
        </div>
      </div>

      {/* Prompts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">System Prompt</h2>
          <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">
            {result.systemPrompt}
          </pre>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">User Prompt</h2>
          <pre className="mt-3 text-sm whitespace-pre-wrap text-gray-700">{result.userPrompt}</pre>
        </div>
      </div>

      {/* Model Settings */}
      {(result.model ||
        result.outputType ||
        result.aspectRatio ||
        result.outputResolution ||
        result.temperature) && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">Model Settings</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {result.model && (
              <div>
                <dt className="text-xs text-gray-500">Model</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{result.model}</dd>
              </div>
            )}
            {result.outputType && (
              <div>
                <dt className="text-xs text-gray-500">Output Type</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{result.outputType}</dd>
              </div>
            )}
            {result.aspectRatio && (
              <div>
                <dt className="text-xs text-gray-500">Aspect Ratio</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{result.aspectRatio}</dd>
              </div>
            )}
            {result.outputResolution && (
              <div>
                <dt className="text-xs text-gray-500">Resolution</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {result.outputResolution}
                </dd>
              </div>
            )}
            {result.temperature && (
              <div>
                <dt className="text-xs text-gray-500">Temperature</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{result.temperature}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Generations List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No generations yet for this prompt version.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Inputs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Outputs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <Link href={`/generations/${gen.id}`}>
                        <RatingBadge rating={gen.resultRating} />
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {gen.inputImages.length}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {gen.outputImages.length}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
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
