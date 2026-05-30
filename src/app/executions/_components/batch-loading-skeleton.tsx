'use client';

export function BatchLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-button bg-surface-sunken h-9 w-56 animate-pulse" />
        <div className="rounded-button bg-surface-sunken h-8 w-28 animate-pulse" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rounded-card border-border bg-surface shadow-card border">
          <div className="flex w-full items-center justify-between px-5 py-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="bg-surface-sunken size-4 animate-pulse rounded" />
              <div className="rounded-pill bg-surface-sunken h-5 w-16 animate-pulse" />
              <div
                className="bg-surface-sunken h-4 animate-pulse rounded"
                style={{ width: 120 + (i % 3) * 40 }}
              />
              <div className="bg-surface-sunken h-4 w-20 animate-pulse rounded" />
              <div className="bg-surface-muted h-3 w-24 animate-pulse rounded" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="bg-surface-sunken size-4 animate-pulse rounded" />
              <div className="bg-surface-muted h-3 w-28 animate-pulse rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BatchLoadMoreSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-card border-border bg-surface shadow-card border">
          <div className="flex w-full items-center justify-between px-5 py-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="bg-surface-sunken size-4 animate-pulse rounded" />
              <div className="rounded-pill bg-surface-sunken h-5 w-16 animate-pulse" />
              <div
                className="bg-surface-sunken h-4 animate-pulse rounded"
                style={{ width: 120 + (i % 3) * 40 }}
              />
              <div className="bg-surface-sunken h-4 w-20 animate-pulse rounded" />
            </div>
            <div className="bg-surface-muted h-3 w-28 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
