import { EmptyState } from '@/components/empty-state';
import { GenerationsList, type GenerationRow } from '@/components/generations-list';
import { db } from '@/db';
import {
  generation,
  generationResult,
  promptVersion,
} from '@/db/schema';
import { and, asc, count, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import Link from 'next/link';
import { fetchPromptVersions } from '@/lib/queries';
import { buildGenerationsQuery, GenerationsFilters } from './generations-filters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    prompt_version_id?: string;
    scene_accuracy_rating?: string;
    product_accuracy_rating?: string;
    unrated?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function GenerationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const order = params.order === 'asc' ? 'asc' : 'desc';

  const conditions = [];
  if (params.prompt_version_id) {
    conditions.push(eq(generation.promptVersionId, params.prompt_version_id));
  }
  if (params.scene_accuracy_rating) {
    conditions.push(
      eq(
        generation.sceneAccuracyRating,
        params.scene_accuracy_rating as 'FAILED' | 'GOOD',
      ),
    );
  }
  if (params.product_accuracy_rating) {
    conditions.push(
      eq(
        generation.productAccuracyRating,
        params.product_accuracy_rating as 'FAILED' | 'GOOD',
      ),
    );
  }
  if (params.unrated === 'true') {
    conditions.push(and(isNull(generation.sceneAccuracyRating), isNull(generation.productAccuracyRating)));
  }
  if (params.from) {
    conditions.push(gte(generation.createdAt, new Date(params.from)));
  }
  if (params.to) {
    conditions.push(lte(generation.createdAt, new Date(params.to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy = order === 'asc' ? asc(generation.createdAt) : desc(generation.createdAt);

  const [rows, totalResult, promptVersions] = await Promise.all([
    db
      .select({
        id: generation.id,
        promptVersionId: generation.promptVersionId,
        promptName: promptVersion.name,
        sceneAccuracyRating: generation.sceneAccuracyRating,
        productAccuracyRating: generation.productAccuracyRating,
        notes: generation.notes,
        executionTime: generation.executionTime,
        createdAt: generation.createdAt,
      })
      .from(generation)
      .innerJoin(promptVersion, eq(promptVersion.id, generation.promptVersionId))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(PAGE_SIZE),
    db.select({ count: count() }).from(generation).where(whereClause),
    fetchPromptVersions(200),
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
      sceneAccuracyRating: row.sceneAccuracyRating,
      productAccuracyRating: row.productAccuracyRating,
      notes: row.notes,
      executionTime: row.executionTime,
      createdAt: row.createdAt.toISOString(),
      resultUrls: urls,
      resultCount: urls.length,
    };
  });

  const filters = {
    scene_accuracy_rating: params.scene_accuracy_rating,
    product_accuracy_rating: params.product_accuracy_rating,
    unrated: params.unrated,
    prompt_version_id: params.prompt_version_id,
    from: params.from,
    to: params.to,
    sort: params.sort ?? 'created_at',
    order: params.order ?? 'desc',
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
      <GenerationsFilters
        params={params}
        promptVersions={promptVersions}
      />

      {/* Sort */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Sort:</span>
        <Link
          href={buildGenerationsQuery({ ...params, order: 'desc' })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${params.order !== 'asc' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Newest first
        </Link>
        <Link
          href={buildGenerationsQuery({ ...params, order: 'asc' })}
          className={`rounded-full px-3 py-1 text-xs font-medium ${params.order === 'asc' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Oldest first
        </Link>
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
