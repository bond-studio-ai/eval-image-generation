export const COMPARE_QUERY_KEY = 'compare';
export const COMPARE_RANGE_QUERY_KEY = 'compareRange';
export const COMPARE_STRATEGY_QUERY_KEY = 'compareStrategy';
export const COMPARE_SOURCE_QUERY_KEY = 'compareSource';

export type AnalyticsComparisonSource = 'preset' | 'raw_input';

export type AnalyticsComparisonRange = {
  from: string;
  to: string;
};

export type AnalyticsComparisonState = {
  enabled: boolean;
  ranges: AnalyticsComparisonRange[];
  strategyIds: string[];
  sources: AnalyticsComparisonSource[];
};

export type AnalyticsComparisonStrategyOption = {
  id: string;
  name: string;
};

export type AnalyticsComparisonSlice = {
  key: string;
  range: AnalyticsComparisonRange;
  strategyId: string;
  strategyName: string;
  source: AnalyticsComparisonSource;
  label: string;
};

export type AnalyticsSearchParams = Record<string, string | string[] | undefined>;

export function getParamValues(
  params: URLSearchParams | AnalyticsSearchParams,
  key: string
): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const value = params[key];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return typeof value === 'string' ? [value] : [];
}

function parseRange(value: string): AnalyticsComparisonRange {
  const [from = '', to = ''] = value.split(':', 2);
  return { from, to };
}

function isComparisonSource(value: string): value is AnalyticsComparisonSource {
  return value === 'preset' || value === 'raw_input';
}

export function parseComparisonState(params: URLSearchParams | AnalyticsSearchParams): AnalyticsComparisonState {
  const enabled = getParamValues(params, COMPARE_QUERY_KEY)[0] === '1';
  const ranges = getParamValues(params, COMPARE_RANGE_QUERY_KEY).map(parseRange);
  const strategyIds = getParamValues(params, COMPARE_STRATEGY_QUERY_KEY).filter(Boolean);
  const sources = getParamValues(params, COMPARE_SOURCE_QUERY_KEY).filter(isComparisonSource);

  return {
    enabled,
    ranges,
    strategyIds,
    sources,
  };
}

export function encodeComparisonRange(range: AnalyticsComparisonRange): string {
  return `${range.from}:${range.to}`;
}

export function formatComparisonSource(source: AnalyticsComparisonSource): string {
  return source === 'raw_input' ? 'Raw input' : 'Preset';
}

export function formatComparisonRange(range: AnalyticsComparisonRange): string {
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  return `${format(range.from)} - ${format(range.to)}`;
}

export function buildComparisonSlices(
  state: AnalyticsComparisonState,
  strategies: AnalyticsComparisonStrategyOption[]
): AnalyticsComparisonSlice[] {
  const strategyMap = new Map(strategies.map((strategy) => [strategy.id, strategy.name]));
  const slices: AnalyticsComparisonSlice[] = [];

  for (const range of state.ranges) {
    if (!range.from || !range.to) continue;
    for (const strategyId of state.strategyIds) {
      const strategyName = strategyMap.get(strategyId);
      if (!strategyName) continue;
      for (const source of state.sources) {
        const label = `${formatComparisonSource(source)} | ${formatComparisonRange(range)} | ${strategyName}`;
        slices.push({
          key: `${strategyId}:${source}:${range.from}:${range.to}`,
          range,
          strategyId,
          strategyName,
          source,
          label,
        });
      }
    }
  }

  return slices;
}
