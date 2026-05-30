import type { AnalyticsComparisonColumn } from '@/app/analytics/comparison-utils';

export type ApplyFilters = (overrides: Record<string, string>) => void;

export type UpdateComparisonColumns = (columns: AnalyticsComparisonColumn[]) => void;
