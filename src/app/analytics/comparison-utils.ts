export const COMPARE_QUERY_KEY = 'compare';
export const COMPARE_COLUMN_QUERY_KEY = 'compareColumn';
export const COMPARE_RANGE_QUERY_KEY = 'compareRange';
export const COMPARE_STRATEGY_QUERY_KEY = 'compareStrategy';
export const COMPARE_SOURCE_QUERY_KEY = 'compareSource';

export type AnalyticsComparisonSource = 'preset' | 'raw_input' | 'benchmark';

export type AnalyticsComparisonRange = {
  from: string;
  to: string;
};

export type AnalyticsComparisonColumn = {
  from: string;
  to: string;
  strategyId: string;
  source: AnalyticsComparisonSource;
};

export type AnalyticsComparisonState = {
  enabled: boolean;
  columns: AnalyticsComparisonColumn[];
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

function parseColumn(value: string): AnalyticsComparisonColumn | null {
  const [from = '', to = '', strategyId = '', source = 'preset'] = value.split('|', 4);
  if (!isComparisonSource(source)) return null;
  return {
    from,
    to,
    strategyId,
    source,
  };
}

function isComparisonSource(value: string): value is AnalyticsComparisonSource {
  return value === 'preset' || value === 'raw_input' || value === 'benchmark';
}

export function parseComparisonState(params: URLSearchParams | AnalyticsSearchParams): AnalyticsComparisonState {
  const enabled = getParamValues(params, COMPARE_QUERY_KEY)[0] === '1';
  const parsedColumns = getParamValues(params, COMPARE_COLUMN_QUERY_KEY)
    .map(parseColumn)
    .filter((column): column is AnalyticsComparisonColumn => column != null);

  if (parsedColumns.length > 0) {
    return {
      enabled,
      columns: parsedColumns,
    };
  }

  const ranges = getParamValues(params, COMPARE_RANGE_QUERY_KEY).map(parseRange);
  const strategyIds = getParamValues(params, COMPARE_STRATEGY_QUERY_KEY).filter(Boolean);
  const sources = getParamValues(params, COMPARE_SOURCE_QUERY_KEY).filter(isComparisonSource);
  const columns: AnalyticsComparisonColumn[] = [];

  for (const range of ranges) {
    for (const strategyId of strategyIds) {
      for (const source of sources) {
        columns.push({
          from: range.from,
          to: range.to,
          strategyId,
          source,
        });
      }
    }
  }

  return {
    enabled,
    columns,
  };
}

export function encodeComparisonRange(range: AnalyticsComparisonRange): string {
  return `${range.from}:${range.to}`;
}

export function encodeComparisonColumn(column: AnalyticsComparisonColumn): string {
  return `${column.from}|${column.to}|${column.strategyId}|${column.source}`;
}

export function formatComparisonSource(source: AnalyticsComparisonSource): string {
  if (source === 'raw_input') return 'Raw input';
  if (source === 'benchmark') return 'Benchmark';
  return 'Preset';
}

export function formatComparisonRange(range: AnalyticsComparisonRange): string {
  if (range.from && range.to) {
    const format = (value: string) =>
      new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    return `${format(range.from)} - ${format(range.to)}`;
  }
  if (range.from) return `From ${range.from}`;
  if (range.to) return `Until ${range.to}`;
  return 'Select date range';
}

export function createEmptyComparisonColumn(
  defaults?: Partial<AnalyticsComparisonColumn>
): AnalyticsComparisonColumn {
  return {
    from: defaults?.from ?? '',
    to: defaults?.to ?? '',
    strategyId: defaults?.strategyId ?? '',
    source: defaults?.source ?? 'preset',
  };
}

export function isComparisonColumnComplete(column: AnalyticsComparisonColumn): boolean {
  return !!(column.from && column.to && column.strategyId);
}

export function buildComparisonColumnLabel(
  column: AnalyticsComparisonColumn,
  strategies: AnalyticsComparisonStrategyOption[]
): string {
  const strategyName = strategies.find((strategy) => strategy.id === column.strategyId)?.name ?? 'Select strategy';
  return `${strategyName} | ${formatComparisonSource(column.source)} | ${formatComparisonRange({
    from: column.from,
    to: column.to,
  })}`;
}

export function buildComparisonSlices(
  state: AnalyticsComparisonState,
  strategies: AnalyticsComparisonStrategyOption[]
): AnalyticsComparisonSlice[] {
  const strategyMap = new Map(strategies.map((strategy) => [strategy.id, strategy.name]));
  const slices: AnalyticsComparisonSlice[] = [];

  for (const column of state.columns) {
    if (!isComparisonColumnComplete(column)) continue;
    const strategyName = strategyMap.get(column.strategyId);
    if (!strategyName) continue;

    slices.push({
      key: encodeComparisonColumn(column),
      range: { from: column.from, to: column.to },
      strategyId: column.strategyId,
      strategyName,
      source: column.source,
      label: `${formatComparisonSource(column.source)} | ${formatComparisonRange({
        from: column.from,
        to: column.to,
      })}`,
    });
  }

  return slices;
}
