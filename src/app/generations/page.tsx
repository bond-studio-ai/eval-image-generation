import { DeleteGenerationButton } from '@/components/delete-generation-button';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import {
  generation,
  generationResult,
  promptVersion,
} from '@/db/schema';
import { and, count, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    prompt_version_id?: string;
    rating?: string;
    unrated?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function GenerationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.prompt_version_id) {
    conditions.push(eq(generation.promptVersionId, params.prompt_version_id));
  }
  if (params.rating) {
    conditions.push(
      eq(
        generation.resultRating,
        params.rating as 'FAILED' | 'POOR' | 'ACCEPTABLE' | 'GOOD' | 'EXCELLENT',
      ),
    );
  }
  if (params.unrated === 'true') {
    conditions.push(isNull(generation.resultRating));
  }
  if (params.from) {
    conditions.push(gte(generation.createdAt, new Date(params.from)));
  }
  if (params.to) {
    conditions.push(lte(generation.createdAt, new Date(params.to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: generation.id,
        promptVersionId: generation.promptVersionId,
        promptName: promptVersion.name,
        resultRating: generation.resultRating,
        notes: generation.notes,
        executionTime: generation.executionTime,
        createdAt: generation.createdAt,
      })
      .from(generation)
      .innerJoin(promptVersion, eq(promptVersion.id, generation.promptVersionId))
      .where(whereClause)
      .orderBy(desc(generation.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(generation).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Fetch result counts
  const data = await Promise.all(
    rows.map(async (row) => {
      const [resultCount] = await db
        .select({ count: count() })
        .from(generationResult)
        .where(eq(generationResult.generationId, row.id));
      return {
        ...row,
        resultCount: resultCount?.count ?? 0,
      };
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generations</h1>
          <p className="mt-1 text-sm text-gray-600">Browse and filter all image generation runs.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'POOR', 'FAILED'].map((r) => (
          <Link
            key={r}
            href={`/generations?rating=${r}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              params.rating === r
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {r}
          </Link>
        ))}
        <Link
          href="/generations?unrated=true"
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            params.unrated === 'true'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Unrated
        </Link>
        {(params.rating || params.unrated || params.from || params.to) && (
          <Link
            href="/generations"
            className="rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Clear Filters
          </Link>
        )}
      </div>

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No generations found"
            description="No generations match your current filters."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Prompt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((gen) => (
                <tr key={gen.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/generations/${gen.id}`}
                      className="hover:text-primary-600 font-medium text-gray-900"
                    >
                      {gen.promptName || 'Untitled'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <RatingBadge rating={gen.resultRating} />
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {gen.resultCount} result{gen.resultCount !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {gen.executionTime ? `${(gen.executionTime / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {new Date(gen.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <DeleteGenerationButton generationId={gen.id} variant="icon" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </div>
      )}
    </div>
  );
}
