/** Reusable skeleton primitives for loading states. */

/** Pulsing block with rounded corners. Use w-*, h-* to size. */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-sunken animate-pulse rounded-md ${className}`} />;
}

/** A page-level skeleton that mimics a heading + subtitle + card grid. */
function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title + subtitle */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-card border-border bg-surface shadow-card border p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-card border-border bg-surface shadow-card space-y-4 border p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-card border-border bg-surface shadow-card overflow-hidden border">
        <div className="bg-surface-muted flex gap-12 px-6 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-border flex gap-12 border-t px-6 py-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the full app shell (sidebar + top bar + content area). */
export function AppShellSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="border-border bg-surface flex w-64 flex-col border-r">
        <div className="border-border flex h-16 items-center gap-2 border-b px-4">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </div>
        <nav className="flex-1 space-y-4 px-2 py-4">
          {Array.from({ length: 3 }).map((_, g) => (
            <div key={g} className="space-y-1">
              <Skeleton className="ml-3 h-3 w-20" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
                  <Skeleton className="size-5 rounded" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </nav>
      </div>
      {/* Content area skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="border-border bg-surface/80 flex h-12 items-center justify-between border-b px-6">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <PageSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
