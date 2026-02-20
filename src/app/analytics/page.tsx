import { db } from '@/db/V1';
import { generation, promptVersion } from '@/db/V1/schema';
import { and, count, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type DistEntry = { rating: string; count: number; percentage: number };

async function getDistributionFor(
  column: typeof generation.sceneAccuracyRating | typeof generation.productAccuracyRating,
): Promise<DistEntry[]> {
  const results = await db
    .select({ rating: column, count: count() })
    .from(generation)
    .where(isNotNull(column))
    .groupBy(column);

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const ratingOrder = ['GOOD', 'FAILED'];

  return ratingOrder.map((rating) => {
    const entry = results.find((r) => r.rating === rating);
    const ratingCount = entry?.count ?? 0;
    return {
      rating,
      count: ratingCount,
      percentage: total > 0 ? Math.round((ratingCount / total) * 10000) / 100 : 0,
    };
  });
}

async function getPromptPerformance() {
  const sceneMap = sql`CASE scene_accuracy_rating WHEN 'FAILED' THEN 0 WHEN 'GOOD' THEN 1 END`;
  const productMap = sql`CASE product_accuracy_rating WHEN 'FAILED' THEN 0 WHEN 'GOOD' THEN 1 END`;

  return db
    .select({
      id: promptVersion.id,
      name: promptVersion.name,
      generationCount: count(generation.id),
      avgSceneRating: sql<number>`ROUND(AVG(${sceneMap})::numeric, 2)`,
      avgProductRating: sql<number>`ROUND(AVG(${productMap})::numeric, 2)`,
    })
    .from(promptVersion)
    .leftJoin(generation, eq(generation.promptVersionId, promptVersion.id))
    .where(isNull(promptVersion.deletedAt))
    .groupBy(promptVersion.id)
    .orderBy(sql`AVG(${sceneMap}) DESC NULLS LAST`)
    .limit(10);
}

async function getOverviewStats() {
  const [totalGens, ratedGens, totalPrompts] = await Promise.all([
    db.select({ count: count() }).from(generation),
    db
      .select({ count: count() })
      .from(generation)
      .where(or(isNotNull(generation.sceneAccuracyRating), isNotNull(generation.productAccuracyRating))),
    db.select({ count: count() }).from(promptVersion).where(isNull(promptVersion.deletedAt)),
  ]);

  return {
    totalGenerations: totalGens[0]?.count ?? 0,
    ratedGenerations: ratedGens[0]?.count ?? 0,
    totalPrompts: totalPrompts[0]?.count ?? 0,
  };
}

const ratingColors: Record<string, string> = {
  GOOD: 'bg-green-500',
  FAILED: 'bg-orange-500',
};

function DistributionChart({ data, title }: { data: DistEntry[]; title: string }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-6 space-y-4">
        {data.map((d) => (
          <div key={d.rating} className="flex items-center gap-4">
            <span className="w-20 text-sm font-medium text-gray-700">{d.rating}</span>
            <div className="flex-1">
              <div className="h-8 w-full rounded-full bg-gray-100">
                <div
                  className={`h-8 rounded-full ${ratingColors[d.rating]} transition-all duration-500`}
                  style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="w-12 text-right text-sm font-medium text-gray-900">{d.count}</span>
            <span className="w-14 text-right text-sm text-gray-700">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [sceneDist, productDist, performance, overview] = await Promise.all([
    getDistributionFor(generation.sceneAccuracyRating),
    getDistributionFor(generation.productAccuracyRating),
    getPromptPerformance(),
    getOverviewStats(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-600">
        Insights into generation quality and prompt performance.
      </p>

      {/* Overview Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Total Generations</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{overview.totalGenerations}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Rated</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{overview.ratedGenerations}</p>
          <p className="mt-1 text-xs text-gray-600">
            {overview.totalGenerations > 0
              ? `${Math.round((overview.ratedGenerations / overview.totalGenerations) * 100)}%`
              : '0%'}{' '}
            of total
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Active Prompts</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{overview.totalPrompts}</p>
        </div>
      </div>

      {/* Rating Distributions — side by side */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionChart data={sceneDist} title="Scene Accuracy" />
        <DistributionChart data={productDist} title="Product Accuracy" />
      </div>

      {/* Prompt Performance */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Prompt Performance</h2>
        {performance.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No data yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="py-3 pr-6 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Prompt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Generations
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Avg Scene
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                    Avg Product
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {performance.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 pr-6 text-sm font-medium text-gray-900">
                      {p.name || 'Untitled'}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {p.generationCount}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {p.avgSceneRating ?? '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {p.avgProductRating ?? '-'}
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
