import Link from 'next/link';
import { Fragment } from 'react';
import { StrategyHoverCard } from '@/components/strategy-hover-card';
import { ChevronRightIcon } from '@/components/ui/icons';
import { StrategyBreakdownPanel } from './strategy-breakdown-panel';
import type { BreakdownData, StrategyRow } from './types';

export function StrategyTableRow({
  row,
  isExpanded,
  breakdown,
  isLoadingBreakdown,
  colSpan,
  onToggleExpand,
  from,
  to,
  model,
  source,
}: {
  row: StrategyRow;
  isExpanded: boolean;
  breakdown: BreakdownData | null | undefined;
  isLoadingBreakdown: boolean;
  colSpan: number;
  onToggleExpand: (id: string) => void;
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}) {
  return (
    <Fragment>
      <tr className="hover:bg-gray-50/50">
        <td className="py-2 pr-2" aria-label="Expand row">
          <button
            type="button"
            onClick={() => onToggleExpand(row.id)}
            className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
          >
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
        </td>
        <td className="py-3 pr-6 text-sm font-medium text-gray-900">
          <StrategyHoverCard strategyId={row.id}>
            <Link
              href={`/strategies/${row.id}`}
              className="text-primary-600 hover:text-primary-500"
            >
              {row.name || 'Unnamed'}
            </Link>
          </StrategyHoverCard>
        </td>
        <td className="px-4 py-3 text-right text-sm text-gray-700">{row.generationCount}</td>
        <td className="px-4 py-3 text-right text-sm">
          {row.sceneRatedCount > 0 ? (
            <>
              <span className="text-green-600">{row.sceneGoodPct}%</span>
              <span className="text-gray-400"> / </span>
              <span className="text-orange-600">{row.sceneFailedPct}%</span>
              <span className="block text-[10px] text-gray-400">{row.sceneRatedCount} rated</span>
            </>
          ) : (
            <span className="text-gray-400">{'—'}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {row.productRatedCount > 0 ? (
            <>
              <span className="text-green-600">{row.productGoodPct}%</span>
              <span className="text-gray-400"> / </span>
              <span className="text-orange-600">{row.productFailedPct}%</span>
              <span className="block text-[10px] text-gray-400">{row.productRatedCount} rated</span>
            </>
          ) : (
            <span className="text-gray-400">{'—'}</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm text-gray-500">
          {row.notRatedCount > 0 ? (
            <>
              {row.notRatedCount}
              <span className="text-[10px] text-gray-400"> ({row.notRatedPct}%)</span>
            </>
          ) : (
            <span className="text-gray-400">0</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm text-gray-700">
          {row.avgExecTimeMs != null ? `${(row.avgExecTimeMs / 1000).toFixed(1)}s` : '—'}
        </td>
      </tr>
      {isExpanded && (
        <tr key={`${row.id}-breakdown`}>
          <td
            colSpan={colSpan}
            className="border-b-2 border-gray-200 bg-gray-50/80 py-6 pr-6 pl-10"
          >
            <StrategyBreakdownPanel
              strategyId={row.id}
              breakdown={breakdown}
              isLoading={isLoadingBreakdown}
              from={from}
              to={to}
              model={model}
              source={source}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
