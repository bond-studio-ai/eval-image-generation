import {
  buildComparisonSlices,
  getParamValues,
  parseComparisonState,
} from '@/app/analytics/comparison-utils';
import { AnalyticsFilters } from '@/app/analytics/analytics-filters';
import { ComparisonSpreadsheet } from '@/app/analytics/comparison-spreadsheet';
import { ProductCategoryRates } from '@/app/analytics/product-category-rates';
import { ReliabilityTab } from '@/app/analytics/reliability-tab';
import { StrategyPerformanceSection } from '@/app/analytics/strategy-performance-section';
import {
  fetchAnalyticsRatings,
  fetchAnalyticsStrategyPerformance,
  fetchStrategies,
} from '@/lib/service-client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    tab?: string | string[];
    from?: string | string[];
    to?: string | string[];
    model?: string | string[];
    source?: string | string[];
    compareColumn?: string | string[];
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

type TabName = 'strategies' | 'products' | 'reliability' | 'compare';

function TabNav({
  active,
  searchParams,
}: {
  active: TabName;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const buildHref = (tab: string) => {
    const params = new URLSearchParams();
    if (tab !== 'strategies') params.set('tab', tab);
    const from = getParamValues(searchParams, 'from')[0];
    const to = getParamValues(searchParams, 'to')[0];
    const model = getParamValues(searchParams, 'model')[0];
    const source = getParamValues(searchParams, 'source')[0];
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (model) params.set('model', model);
    if (source && source !== 'all') params.set('source', source);
    if (tab === 'compare') {
      for (const value of getParamValues(searchParams, 'compareColumn'))
        params.append('compareColumn', value);
    }
    const qs = params.toString();
    return `/${qs ? `?${qs}` : ''}`;
  };

  const tabs: { key: TabName; label: string }[] = [
    { key: 'strategies', label: 'Strategies' },
    { key: 'products', label: 'Products' },
    { key: 'reliability', label: 'Reliability' },
    { key: 'compare', label: 'Compare' },
  ];

  return (
    <div className="mt-4 flex gap-1 border-b border-gray-200">
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
  const tabRaw = getParamValues(params, 'tab')[0];
  const activeTab: TabName =
    tabRaw === 'products'
      ? 'products'
      : tabRaw === 'reliability'
        ? 'reliability'
        : tabRaw === 'compare'
          ? 'compare'
          : 'strategies';
  const from = getParamValues(params, 'from')[0];
  const to = getParamValues(params, 'to')[0];
  const model = getParamValues(params, 'model')[0];
  const source = getParamValues(params, 'source')[0];

  const isCompare = activeTab === 'compare';
  const comparison = isCompare
    ? parseComparisonState({ ...params, compare: '1' })
    : { enabled: false, columns: [] };

  const tz = getParamValues(params, 'tz')[0];
  const ratingParams: Record<string, string> = {};
  if (from) ratingParams.from = from;
  if (to) ratingParams.to = to;
  if (model) ratingParams.model = model;
  if (source && source !== 'all') ratingParams.source = source;
  if (tz) ratingParams.tz = tz;

  const [perfData, strategies, sceneRatings, productRatings] = await Promise.all([
    fetchAnalyticsStrategyPerformance(ratingParams),
    fetchStrategies(100),
    isCompare ? Promise.resolve(null) : fetchAnalyticsRatings({ ...ratingParams, type: 'scene' }),
    isCompare ? Promise.resolve(null) : fetchAnalyticsRatings({ ...ratingParams, type: 'product' }),
  ]);

  const sceneDist = sceneRatings?.distribution ?? [];
  const productDist = productRatings?.distribution ?? [];
  const overview = {
    totalGenerations: sceneRatings?.totalGenerations ?? 0,
    ratedGenerations: sceneRatings?.ratedGenerations ?? 0,
  };
  const models = perfData.models;
  const comparisonSlices = buildComparisonSlices(comparison, strategies);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="mt-1 text-sm text-gray-600">
        {source === 'benchmark'
          ? 'Insights into benchmark generation quality and benchmark performance.'
          : 'Insights into generation quality and strategy performance.'}
      </p>
      <TabNav active={activeTab} searchParams={params} />
      <AnalyticsFilters models={models} strategies={strategies} activeTab={activeTab} />

      {!isCompare && (
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
      )}

      {isCompare ? (
        <ComparisonSpreadsheet slices={comparisonSlices} model={model} />
      ) : (
        <>
          {activeTab === 'strategies' && (
            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <DistributionChart data={sceneDist} title="Scene Accuracy" />
                <DistributionChart data={productDist} title="Product Accuracy" />
              </div>
            </div>
          )}
          {activeTab === 'strategies' && (
            <StrategyPerformanceSection from={from} to={to} model={model} source={source} />
          )}
          {activeTab === 'products' && (
            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-gray-900">Product Category Rates</h2>
              <p className="mt-1 text-sm text-gray-600">
                Success and failure rates for each product category based on evaluation data. Expand a row to see
                checklist issue counts and freeform notes from failing evaluations; one eval can add to several issue
                counts.
              </p>
              <div className="mt-4">
                <ProductCategoryRates from={from} to={to} model={model} source={source} />
              </div>
            </div>
          )}
          {activeTab === 'reliability' && (
            <ReliabilityTab from={from} to={to} model={model} source={source} />
          )}
        </>
      )}
    </div>
  );
}
