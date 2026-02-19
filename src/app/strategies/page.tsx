import { EmptyState } from '@/components/empty-state';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { Pagination } from '@/components/pagination';
import { db } from '@/db';
import { generation, strategy } from '@/db/schema';
import { withImageParams } from '@/lib/image-utils';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

export default async function StrategiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';
  const offset = (page - 1) * limit;

  const conditions = includeDeleted ? [] : [isNull(strategy.deletedAt)];

  const [rows, totalResult] = await Promise.all([
    db.query.strategy.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(strategy.createdAt)],
      limit,
      offset,
      with: {
        sourceResult: {
          columns: { url: true },
        },
      },
    }),
    db
      .select({ count: count() })
      .from(strategy)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data = await Promise.all(
    rows.map(async (s) => {
      const genCount = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.strategyId, s.id));
      return { ...s, imageUrl: s.sourceResult.url, generationCount: genCount[0]?.count ?? 0 };
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Saved generation outputs that can be fed back as input for new generations.
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No strategies"
            description="Create a strategy from a generation output to start chaining generations."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <Link
              key={s.id}
              href={`/strategies/${s.id}`}
              className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs transition-shadow hover:shadow-md"
            >
              <ImageWithSkeleton
                src={withImageParams(s.imageUrl)}
                alt={s.name}
                loading="lazy"
                wrapperClassName="h-48 w-full bg-gray-50"
              />
              <div className="p-4">
                <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                  {s.name}
                </h3>
                {s.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{s.description}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>{s.generationCount} generation{s.generationCount !== 1 ? 's' : ''}</span>
                  <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                  {s.deletedAt && (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                      Deleted
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination page={page} totalPages={totalPages} total={total} />
        </div>
      )}
    </div>
  );
}
