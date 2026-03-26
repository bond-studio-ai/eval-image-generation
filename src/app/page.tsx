import { AnalyticsFilters } from '@/app/analytics/analytics-filters';
import { ProductCategoryRates } from '@/app/analytics/product-category-rates';
import { ReliabilityTab } from '@/app/analytics/reliability-tab';
import { StrategyPerformanceSection } from '@/app/analytics/strategy-performance-section';
import { fetchAnalyticsRatings, fetchAnalyticsStrategyPerformance } from '@/lib/service-client';
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

type TabName = 'strategies' | 'products' | 'reliability';

function TabNav({ active, searchParams }: { active: TabName; searchParams: Record<string, string | undefined> }) {
  const buildHref = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== 'strategies') params.set('tab', tab);
    if (searchParams.from) params.set('from', searchParams.from);
    if (searchParams.to) params.set('to', searchParams.to);
    if (searchParams.model) params.set('model', searchParams.model);
    const qs = params.toString();
    return `/${qs ? `?${qs}` : ''}`;
  };

  const tabs: { key: TabName; label: string }[] = [
    { key: 'strategies', label: 'Strategies' },
    { key: 'products', label: 'Products' },
    { key: 'reliability', label: 'Reliability' },
  ];

  return (
    <div className="mt-6 flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={buildHref(tab.key)}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${active === tab.key
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab: TabName =
    params.tab === 'products' ? 'products' : params.tab === 'reliability' ? 'reliability' : 'strategies';
  const from = params.from;
  const to = params.to;
  const model = params.model;

  const ratingParams: Record<string, string> = {};
  if (from) ratingParams.from = from;
  if (to) ratingParams.to = to;
  if (model) ratingParams.model = model;

  const [sceneRatings, productRatings, perfData] = await Promise.all([
    fetchAnalyticsRatings({ ...ratingParams, type: 'scene' }),
    fetchAnalyticsRatings({ ...ratingParams, type: 'product' }),
    fetchAnalyticsStrategyPerformance(ratingParams),
  ]);

  const sceneDist = sceneRatings.distribution;
  const productDist = productRatings.distribution;
  const overview = {
    totalGenerations: sceneRatings.totalGenerations,
    ratedGenerations: sceneRatings.ratedGenerations,
  };
  const models = perfData.models;

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

      {activeTab === 'strategies' && (
        <>
          {/* Rating Distributions */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DistributionChart data={sceneDist} title="Scene Accuracy" />
            <DistributionChart data={productDist} title="Product Accuracy" />
          </div>

          {/* Strategy performance and error breakdown */}
          <StrategyPerformanceSection from={from} to={to} model={model} />
        </>
      )}

      {activeTab === 'products' && (
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

      {activeTab === 'reliability' && (
        <ReliabilityTab from={from} to={to} model={model} />
      )}
    </div>
  );
}
