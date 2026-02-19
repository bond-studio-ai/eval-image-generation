import { ExpandableImage } from '@/components/expandable-image';
import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { generation, strategy } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.strategy.findFirst({
    where: eq(strategy.id, id),
    with: {
      sourceResult: {
        columns: { url: true, generationId: true },
        with: {
          generation: {
            columns: { id: true },
            with: {
              promptVersion: { columns: { name: true } },
            },
          },
        },
      },
      generations: {
        orderBy: (g, { desc }) => [desc(g.createdAt)],
        with: {
          results: true,
          promptVersion: { columns: { name: true } },
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const genCountResult = await db
    .select({ count: count() })
    .from(generation)
    .where(eq(generation.strategyId, id));

  const genCount = genCountResult[0]?.count ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/strategies" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Strategies
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{result.name}</h1>
          {result.description && (
            <p className="mt-1 text-sm text-gray-600">{result.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {result.deletedAt ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deleted
            </span>
          ) : (
            <Link
              href={`/generate?strategy_id=${result.id}`}
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
          <p className="text-sm font-medium text-gray-600">Generations Using This</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{genCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Source Generation</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            <Link
              href={`/generations/${result.sourceResult.generationId}`}
              className="text-primary-600 hover:text-primary-500 inline-flex items-center gap-1"
            >
              {result.sourceResult.generation.promptVersion?.name || 'Untitled'} generation
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>
          </p>
        </div>
      </div>

      {/* Strategy Image */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Strategy Image</h2>
        <ExpandableImage
          src={result.sourceResult.url}
          alt={result.name}
          wrapperClassName="relative block h-96 w-full max-w-2xl rounded-lg border border-gray-200 bg-gray-50"
        />
      </div>

      {/* Generations that used this strategy */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        {result.generations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            No generations have used this strategy yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Prompt Version</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Outputs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {result.generations.map((gen) => (
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
                      {gen.promptVersion?.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {gen.results.length}
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
