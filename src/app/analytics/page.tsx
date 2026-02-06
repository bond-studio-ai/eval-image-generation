import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { count, eq, isNotNull, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getRatingDistribution() {
  const results = await db
    .select({
      rating: generation.resultRating,
      count: count(),
    })
    .from(generation)
    .where(isNotNull(generation.resultRating))
    .groupBy(generation.resultRating);

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const ratingOrder = ['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'POOR', 'FAILED'];

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
  const ratingMap = sql`CASE result_rating
    WHEN 'FAILED' THEN 0
    WHEN 'POOR' THEN 1
    WHEN 'ACCEPTABLE' THEN 2
    WHEN 'GOOD' THEN 3
    WHEN 'EXCELLENT' THEN 4
  END`;

  return db
    .select({
      id: promptVersion.id,
      name: promptVersion.name,
      generationCount: count(generation.id),
      avgRating: sql<number>`ROUND(AVG(${ratingMap})::numeric, 2)`,
    })
    .from(promptVersion)
    .leftJoin(generation, eq(generation.promptVersionId, promptVersion.id))
    .where(isNull(promptVersion.deletedAt))
    .groupBy(promptVersion.id)
    .orderBy(sql`AVG(${ratingMap}) DESC NULLS LAST`)
    .limit(10);
}

async function getOverviewStats() {
  const [totalGens, ratedGens, totalPrompts] = await Promise.all([
    db.select({ count: count() }).from(generation),
    db.select({ count: count() }).from(generation).where(isNotNull(generation.resultRating)),
    db.select({ count: count() }).from(promptVersion).where(isNull(promptVersion.deletedAt)),
  ]);

  return {
    totalGenerations: totalGens[0]?.count ?? 0,
    ratedGenerations: ratedGens[0]?.count ?? 0,
    totalPrompts: totalPrompts[0]?.count ?? 0,
  };
}

const ratingColors: Record<string, string> = {
  EXCELLENT: 'bg-emerald-500',
  GOOD: 'bg-blue-500',
  ACCEPTABLE: 'bg-yellow-500',
  POOR: 'bg-orange-500',
  FAILED: 'bg-red-500',
};

export default async function AnalyticsPage() {
  const [distribution, performance, overview] = await Promise.all([
    getRatingDistribution(),
    getPromptPerformance(),
    getOverviewStats(),
  ]);

  const maxDistCount = Math.max(...distribution.map((d) => d.count), 1);

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

      {/* Rating Distribution */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">Rating Distribution</h2>
        <div className="mt-6 space-y-4">
          {distribution.map((d) => (
            <div key={d.rating} className="flex items-center gap-4">
              <span className="w-24 text-sm font-medium text-gray-700">{d.rating}</span>
              <div className="flex-1">
                <div className="h-8 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-8 rounded-full ${ratingColors[d.rating]} transition-all duration-500`}
                    style={{ width: `${maxDistCount > 0 ? (d.count / maxDistCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="w-16 text-right text-sm font-medium text-gray-900">{d.count}</span>
              <span className="w-16 text-right text-sm text-gray-700">{d.percentage}%</span>
            </div>
          ))}
        </div>
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
                    Avg Rating
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
                      {p.avgRating ?? '-'}
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
