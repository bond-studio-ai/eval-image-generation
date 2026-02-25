import { AnalyticsFilters } from '@/app/analytics/analytics-filters';
import { ProductCategoryRates } from '@/app/analytics/product-category-rates';
import { StrategyPerformanceSection } from '@/app/analytics/strategy-performance-section';
import { db } from '@/db';
import { generation, strategy, strategyRun, strategyStepResult } from '@/db/schema';
import { and, count, eq, gte, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    model?: string;
  }>;
}

type DistEntry = { rating: string; count: number; percentage: number };

async function getDistributionFor(
  column: typeof generation.sceneAccuracyRating | typeof generation.productAccuracyRating,
  dateConditions: ReturnType<typeof and>[],
  modelCondition: ReturnType<typeof eq> | undefined,
): Promise<DistEntry[]> {
  const conditions = [isNotNull(column), ...dateConditions];

  let query;
  if (modelCondition) {
    query = db
      .select({ rating: column, count: count() })
      .from(generation)
      .innerJoin(strategyStepResult, and(eq(strategyStepResult.generationId, generation.id), isNotNull(strategyStepResult.generationId)))
      .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
      .innerJoin(strategy, eq(strategy.id, strategyRun.strategyId))
      .where(and(...conditions, modelCondition))
      .groupBy(column);
  } else {
    query = db
      .select({ rating: column, count: count() })
      .from(generation)
      .where(and(...conditions))
      .groupBy(column);
  }

  const results = await query;
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

async function getOverviewStats(
  dateConditions: ReturnType<typeof and>[],
  modelCondition: ReturnType<typeof eq> | undefined,
) {
  if (modelCondition) {
    const [totalGens, ratedGens] = await Promise.all([
      db
        .select({ count: count() })
        .from(generation)
        .innerJoin(strategyStepResult, and(eq(strategyStepResult.generationId, generation.id), isNotNull(strategyStepResult.generationId)))
        .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
        .innerJoin(strategy, eq(strategy.id, strategyRun.strategyId))
        .where(and(...dateConditions, modelCondition)),
      db
        .select({ count: count() })
        .from(generation)
        .innerJoin(strategyStepResult, and(eq(strategyStepResult.generationId, generation.id), isNotNull(strategyStepResult.generationId)))
        .innerJoin(strategyRun, eq(strategyRun.id, strategyStepResult.strategyRunId))
        .innerJoin(strategy, eq(strategy.id, strategyRun.strategyId))
        .where(and(...dateConditions, modelCondition, or(isNotNull(generation.sceneAccuracyRating), isNotNull(generation.productAccuracyRating)))),
    ]);
    return {
      totalGenerations: totalGens[0]?.count ?? 0,
      ratedGenerations: ratedGens[0]?.count ?? 0,
    };
  }

  const [totalGens, ratedGens] = await Promise.all([
    db.select({ count: count() }).from(generation).where(and(...dateConditions)),
    db
      .select({ count: count() })
      .from(generation)
      .where(and(...dateConditions, or(isNotNull(generation.sceneAccuracyRating), isNotNull(generation.productAccuracyRating)))),
  ]);

  return {
    totalGenerations: totalGens[0]?.count ?? 0,
    ratedGenerations: ratedGens[0]?.count ?? 0,
  };
}

async function getAvailableModels(): Promise<string[]> {
  const rows = await db
    .select({ model: strategy.model })
    .from(strategy)
    .where(isNull(strategy.deletedAt))
    .groupBy(strategy.model);
  return rows.map((r) => r.model).sort();
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

function TabNav({ active, searchParams }: { active: 'strategies' | 'products'; searchParams: Record<string, string | undefined> }) {
  const buildHref = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== 'strategies') params.set('tab', tab);
    if (searchParams.from) params.set('from', searchParams.from);
    if (searchParams.to) params.set('to', searchParams.to);
    if (searchParams.model) params.set('model', searchParams.model);
    const qs = params.toString();
    return `/analytics${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="mt-6 flex gap-1 border-b border-gray-200">
      <Link
        href={buildHref('strategies')}
        className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          active === 'strategies'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Strategies
      </Link>
      <Link
        href={buildHref('products')}
        className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
          active === 'products'
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        Products
      </Link>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab = params.tab === 'products' ? 'products' : 'strategies';
  const from = params.from;
  const to = params.to;
  const model = params.model;

  const dateConditions: any[] = [];
  if (from) dateConditions.push(gte(generation.createdAt, new Date(from)));
  if (to) {
    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);
    dateConditions.push(lte(generation.createdAt, endOfDay));
  }
  const modelCondition = model ? eq(strategy.model, model) : undefined;

  const [sceneDist, productDist, overview, models] = await Promise.all([
    getDistributionFor(generation.sceneAccuracyRating, dateConditions, modelCondition),
    getDistributionFor(generation.productAccuracyRating, dateConditions, modelCondition),
    getOverviewStats(dateConditions, modelCondition),
    getAvailableModels(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-600">
        Insights into generation quality and strategy performance.
      </p>

      <AnalyticsFilters models={models} />
      <TabNav active={activeTab} searchParams={params} />

      {/* Overview Stats — shared across both tabs */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      {activeTab === 'strategies' ? (
        <>
          {/* Rating Distributions */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DistributionChart data={sceneDist} title="Scene Accuracy" />
            <DistributionChart data={productDist} title="Product Accuracy" />
          </div>

          {/* Strategy performance and error breakdown */}
          <StrategyPerformanceSection from={from} to={to} model={model} />
        </>
      ) : (
        <>
          {/* Product Category Rates */}
          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-gray-900">Product Category Rates</h2>
            <p className="mt-1 text-sm text-gray-600">
              Success and failure rates for each product category based on evaluation data.
            </p>
            <div className="mt-4">
              <ProductCategoryRates from={from} to={to} model={model} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
