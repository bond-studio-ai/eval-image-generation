import { ProductCategoryRates } from "@/app/analytics/product-category-rates";
import type { BreakdownData, IssueItem } from "./types";

function RatingSummaryBar({ good, failed, unset, label }: { good: number; failed: number; unset: number; label: string }) {
  const rated = good + failed;
  if (rated === 0 && unset === 0) return null;
  const pct = (n: number) => (rated > 0 ? Math.round((n / rated) * 100) : 0);
  return (
    <div className="space-y-1">
      <p className="text-text-secondary text-caption font-medium">{label}</p>
      {rated > 0 ? (
        <div className="bg-surface-sunken flex h-5 w-full overflow-hidden rounded-full">
          {good > 0 && (
            <div className="bg-success-500 text-text-inverse flex items-center justify-center text-[10px] font-medium" style={{ width: `${pct(good)}%` }} title={`Good: ${good}`}>
              {pct(good) >= 12 ? `${pct(good)}%` : ""}
            </div>
          )}
          {failed > 0 && (
            <div className="bg-warning-500 text-text-inverse flex items-center justify-center text-[10px] font-medium" style={{ width: `${pct(failed)}%` }} title={`Failed: ${failed}`}>
              {pct(failed) >= 12 ? `${pct(failed)}%` : ""}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-sunken flex h-5 w-full items-center rounded-full px-3">
          <span className="text-text-disabled text-[10px]">No rated generations</span>
        </div>
      )}
      <div className="text-text-muted flex gap-3 text-[10px]">
        <span>
          <span className="bg-success-500 inline-block size-2 rounded-full" /> Good {good}
        </span>
        <span>
          <span className="bg-warning-500 inline-block size-2 rounded-full" /> Failed {failed}
        </span>
        {unset > 0 && <span className="text-text-disabled">({unset} unrated)</span>}
      </div>
    </div>
  );
}

function IssueList({ title, items, total, colorClass }: { title: string; items: IssueItem[]; total: number; colorClass: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-text-muted text-caption mb-1.5 font-medium tracking-wider uppercase">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => {
          const pctVal = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <li key={item.issue} className="text-body flex items-center justify-between gap-3">
              <span className="text-text-secondary min-w-0 truncate" title={item.issue}>
                {item.issue}
              </span>
              <span className={`text-caption shrink-0 rounded-full px-2 py-0.5 font-medium ${colorClass}`}>{pctVal}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StrategyBreakdownPanel({
  strategyId,
  breakdown,
  isLoading,
  from,
  to,
  model,
  source
}: {
  strategyId: string;
  breakdown: BreakdownData | null | undefined;
  isLoading: boolean;
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}) {
  if (isLoading) {
    return <p className="text-text-muted text-body">Loading breakdown…</p>;
  }
  if (!breakdown) {
    return <p className="text-text-muted text-body">No data available.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Rating summary bars */}
      {breakdown.rating_summary && (
        <div className="space-y-3 lg:col-span-2">
          <p className="text-text-muted text-caption font-medium tracking-wider uppercase">Rating distribution</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <RatingSummaryBar label="Scene accuracy" good={breakdown.rating_summary.scene_good} failed={breakdown.rating_summary.scene_failed} unset={breakdown.rating_summary.scene_unset} />
            <RatingSummaryBar label="Product accuracy" good={breakdown.rating_summary.product_good} failed={breakdown.rating_summary.product_failed} unset={breakdown.rating_summary.product_unset} />
          </div>
        </div>
      )}

      {/* Per-strategy product category rates */}
      <div className="lg:col-span-2">
        <ProductCategoryRates strategyId={strategyId} from={from} to={to} model={model} source={source} compact />
      </div>

      {/* Scene evaluation issues */}
      <IssueList title="Scene accuracy issues" items={breakdown.scene_issues} total={(breakdown.rating_summary?.scene_good ?? 0) + (breakdown.rating_summary?.scene_failed ?? 0)} colorClass="bg-danger-100 text-danger-700" />

      {/* Product evaluation issues */}
      <IssueList title="Product accuracy issues" items={breakdown.product_issues} total={(breakdown.rating_summary?.product_good ?? 0) + (breakdown.rating_summary?.product_failed ?? 0)} colorClass="bg-warning-100 text-warning-700" />

      {/* Execution errors */}
      {breakdown.execution_errors.length > 0 && (
        <div className="lg:col-span-2">
          <p className="text-text-muted text-caption mb-1.5 font-medium tracking-wider uppercase">Execution errors</p>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {breakdown.execution_errors.map((item, index) => (
              <li key={`${index}-${item.reason}`} className="text-body flex items-center justify-between gap-3">
                <span className="text-text-secondary min-w-0 truncate" title={item.reason}>
                  {item.reason}
                </span>
                <span className="text-text-secondary bg-border text-caption shrink-0 rounded-full px-2 py-0.5 font-medium">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {breakdown.scene_issues.length === 0 && breakdown.product_issues.length === 0 && breakdown.execution_errors.length === 0 && !breakdown.rating_summary && (
        <p className="text-text-muted text-body lg:col-span-2">No evaluation data or errors for this strategy.</p>
      )}
    </div>
  );
}
