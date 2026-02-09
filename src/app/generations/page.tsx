import { EmptyState } from '@/components/empty-state';
import { GenerationsList, type GenerationRow } from '@/components/generations-list';
import { db } from '@/db';
import {
  generation,
  generationResult,
  promptVersion,
} from '@/db/schema';
import { and, count, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

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

  const conditions = [];
  if (params.prompt_version_id) {
    conditions.push(eq(generation.promptVersionId, params.prompt_version_id));
  }
  if (params.rating) {
    conditions.push(
      eq(
        generation.resultRating,
        params.rating as 'FAILED' | 'GOOD',
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
      .limit(PAGE_SIZE),
    db.select({ count: count() }).from(generation).where(whereClause),
  ]);

  const total = totalResult[0]?.count ?? 0;

  // Batch-fetch result URLs for all generations in a single query
  const genIds = rows.map((r) => r.id);
  const allResults = genIds.length > 0
    ? await db
        .select({
          generationId: generationResult.generationId,
          url: generationResult.url,
        })
        .from(generationResult)
        .where(inArray(generationResult.generationId, genIds))
    : [];

  const resultsByGenId = new Map<string, string[]>();
  for (const r of allResults) {
    const list = resultsByGenId.get(r.generationId) ?? [];
    list.push(r.url);
    resultsByGenId.set(r.generationId, list);
  }

  const initialData: GenerationRow[] = rows.map((row) => {
    const urls = resultsByGenId.get(row.id) ?? [];
    return {
      id: row.id,
      promptVersionId: row.promptVersionId,
      promptName: row.promptName,
      resultRating: row.resultRating,
      notes: row.notes,
      executionTime: row.executionTime,
      createdAt: row.createdAt.toISOString(),
      resultUrls: urls,
      resultCount: urls.length,
    };
  });

  const filters = {
    rating: params.rating,
    unrated: params.unrated,
    prompt_version_id: params.prompt_version_id,
    from: params.from,
    to: params.to,
  };

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
        {['GOOD', 'FAILED'].map((r) => (
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

      {initialData.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No generations found"
            description="No generations match your current filters."
          />
        </div>
      ) : (
        <GenerationsList
          initialData={initialData}
          initialTotal={total}
          pageSize={PAGE_SIZE}
          filters={filters}
        />
      )}
    </div>
  );
}
