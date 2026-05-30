import type { Metadata } from 'next';
import { AnalyticsFilters } from '@/app/analytics/analytics-filters';
import { ComparisonSpreadsheet } from '@/app/analytics/comparison-spreadsheet';
import {
  buildComparisonSlices,
  getParamValues,
  parseComparisonState,
} from '@/app/analytics/comparison-utils';
import { ProductCategoryRates } from '@/app/analytics/product-category-rates';
import { ReliabilityTab } from '@/app/analytics/reliability-tab';
import { StrategyPerformanceSection } from '@/app/analytics/strategy-performance-section';
import { PageHeader } from '@/components/page-header';
import { Card, StatCard } from '@/components/ui/card';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import {
  fetchAnalyticsRatings,
  fetchAnalyticsStrategyPerformance,
  fetchStrategies,
} from '@/lib/service-client';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Insights into generation quality and strategy performance.',
};

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

const RATING_BAR_COLOR: Record<string, string> = {
  GOOD: 'bg-success-500',
  FAILED: 'bg-warning-500',
};

function DistributionChart({ data, title }: { data: DistEntry[]; title: string }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <h2 className="text-h3 text-text-primary font-semibold">{title}</h2>
      <div className="mt-6 space-y-4">
        {data.map((d) => (
          <div key={d.rating} className="flex items-center gap-4">
            <span className="text-body text-text-secondary w-20 font-medium">{d.rating}</span>
            <div className="flex-1">
              <div className="rounded-pill bg-surface-sunken h-8 w-full">
                <div
                  className={`rounded-pill h-8 ${RATING_BAR_COLOR[d.rating] ?? 'bg-text-disabled'} transition-all duration-500`}
                  style={{ width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-body text-text-primary w-12 text-right font-medium">
              {d.count}
            </span>
            <span className="text-body text-text-secondary w-14 text-right">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

type TabName = 'strategies' | 'products' | 'reliability' | 'compare';

function buildTabHref(
  tab: TabName,
  searchParams: Record<string, string | string[] | undefined>,
): string {
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

  const tabItems: TabItem<TabName>[] = [
    { key: 'strategies', label: 'Strategies', href: buildTabHref('strategies', params) },
    { key: 'products', label: 'Products', href: buildTabHref('products', params) },
    { key: 'reliability', label: 'Reliability', href: buildTabHref('reliability', params) },
    { key: 'compare', label: 'Compare', href: buildTabHref('compare', params) },
  ];

  const ratedPct =
    overview.totalGenerations > 0
      ? `${Math.round((overview.ratedGenerations / overview.totalGenerations) * 100)}%`
      : '0%';

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle={
          source === 'benchmark'
            ? 'Insights into benchmark generation quality and benchmark performance.'
            : 'Insights into generation quality and strategy performance.'
        }
      />
      <div className="mt-4">
        <Tabs items={tabItems} active={activeTab} label="Analytics views" />
      </div>
      <AnalyticsFilters models={models} strategies={strategies} activeTab={activeTab} />

      {!isCompare && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Total Generations" value={overview.totalGenerations} />
          <StatCard label="Rated" value={overview.ratedGenerations} hint={`${ratedPct} of total`} />
        </div>
      )}

      {isCompare ? (
        <ComparisonSpreadsheet slices={comparisonSlices} model={model} />
      ) : (
        <>
          {activeTab === 'strategies' && (
            <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DistributionChart data={sceneDist} title="Scene Accuracy" />
              <DistributionChart data={productDist} title="Product Accuracy" />
            </div>
          )}
          {activeTab === 'strategies' && (
            <StrategyPerformanceSection from={from} to={to} model={model} source={source} />
          )}
          {activeTab === 'products' && (
            <Card className="mt-8">
              <h2 className="text-h3 text-text-primary font-semibold">Product Category Rates</h2>
              <p className="text-body text-text-secondary mt-1">
                Success and failure rates for each product category based on evaluation data. Expand
                a row to see checklist issue counts and freeform notes from failing evaluations; one
                eval can add to several issue counts.
              </p>
              <div className="mt-4">
                <ProductCategoryRates from={from} to={to} model={model} source={source} />
              </div>
            </Card>
          )}
          {activeTab === 'reliability' && (
            <ReliabilityTab from={from} to={to} model={model} source={source} />
          )}
        </>
      )}
    </div>
  );
}
