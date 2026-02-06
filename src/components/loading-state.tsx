/** Reusable skeleton primitives for loading states. */

/** Pulsing block with rounded corners. Use w-*, h-* to size. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

/** A page-level skeleton that mimics a heading + subtitle + card grid. */
export function PageSkeleton() {
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
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 flex gap-12">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-t border-gray-200 px-6 py-4 flex gap-12">
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

/** Skeleton for the Generate page layout. */
export function GeneratePageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Prompt version selector card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>

      {/* Two-column prompt editors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>

      {/* Model settings row */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Generate button placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton for the full app shell (sidebar + content area). */
export function AppShellSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      {/* Content area skeleton */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PageSkeleton />
        </div>
      </div>
    </div>
  );
}
