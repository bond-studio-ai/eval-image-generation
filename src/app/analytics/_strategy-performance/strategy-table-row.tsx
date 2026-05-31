import Link from "next/link";
import { StrategyHoverCard } from "@/components/strategy-hover-card";
import { ChevronRightIcon } from "@/components/ui/icons";
import { StrategyBreakdownPanel } from "./strategy-breakdown-panel";
import type { BreakdownData, StrategyRow } from "./types";

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
  source
}: {
  row: StrategyRow;
  isExpanded: boolean;
  breakdown: BreakdownData | null | undefined;
  isLoadingBreakdown: boolean;
  colSpan: number;
  onToggleExpand: (id: string) => void;
  from?: string | undefined;
  to?: string | undefined;
  model?: string | undefined;
  source?: string | undefined;
}) {
  return (
    <>
      <tr className="hover:bg-surface-muted/50">
        <td className="py-2 pr-2" aria-label="Expand row">
          <button
            type="button"
            onClick={() => {
              onToggleExpand(row.id);
            }}
            className="text-text-muted hover:text-text-secondary hover:bg-border rounded p-1"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse row" : "Expand row"}
          >
            <ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </button>
        </td>
        <td className="text-text-primary text-body py-3 pr-6 font-medium">
          <StrategyHoverCard strategyId={row.id}>
            <Link href={`/strategies/${row.id}`} className="text-primary-600 hover:text-primary-500">
              {row.name || "Unnamed"}
            </Link>
          </StrategyHoverCard>
        </td>
        <td className="text-text-secondary text-body px-4 py-3 text-right">{row.generationCount}</td>
        <td className="text-body px-4 py-3 text-right">
          {row.sceneRatedCount > 0 ? (
            <>
              <span className="text-success-600">{row.sceneGoodPct}%</span>
              <span className="text-text-disabled"> / </span>
              <span className="text-warning-600">{row.sceneFailedPct}%</span>
              <span className="text-text-disabled block text-[10px]">{row.sceneRatedCount} rated</span>
            </>
          ) : (
            <span className="text-text-disabled">—</span>
          )}
        </td>
        <td className="text-body px-4 py-3 text-right">
          {row.productRatedCount > 0 ? (
            <>
              <span className="text-success-600">{row.productGoodPct}%</span>
              <span className="text-text-disabled"> / </span>
              <span className="text-warning-600">{row.productFailedPct}%</span>
              <span className="text-text-disabled block text-[10px]">{row.productRatedCount} rated</span>
            </>
          ) : (
            <span className="text-text-disabled">—</span>
          )}
        </td>
        <td className="text-text-muted text-body px-4 py-3 text-right">
          {row.notRatedCount > 0 ? (
            <>
              {row.notRatedCount}
              <span className="text-text-disabled text-[10px]"> ({row.notRatedPct}%)</span>
            </>
          ) : (
            <span className="text-text-disabled">0</span>
          )}
        </td>
        <td className="text-text-secondary text-body px-4 py-3 text-right">{row.avgExecTimeMs == null ? "—" : `${(row.avgExecTimeMs / 1000).toFixed(1)}s`}</td>
      </tr>
      {isExpanded && (
        <tr key={`${row.id}-breakdown`}>
          <td colSpan={colSpan} className="border-border bg-surface-muted/80 border-b-2 py-6 pr-6 pl-10">
            <StrategyBreakdownPanel strategyId={row.id} breakdown={breakdown} isLoading={isLoadingBreakdown} from={from} to={to} model={model} source={source} />
          </td>
        </tr>
      )}
    </>
  );
}
