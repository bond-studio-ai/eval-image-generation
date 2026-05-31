"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

interface ScopeToggleProps {
  benchmarkLabel?: string;
  defaultLabel?: string;
}

export function ScopeToggle(props: ScopeToggleProps) {
  return (
    <Suspense fallback={null}>
      <ScopeToggleInner {...props} />
    </Suspense>
  );
}

function ScopeToggleInner({ benchmarkLabel = "Benchmark", defaultLabel = "Standard" }: ScopeToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "benchmark" ? "benchmark" : "default";

  const setScope = useCallback(
    (nextScope: "default" | "benchmark") => {
      const next = new URLSearchParams(searchParams.toString());
      if (nextScope === "benchmark") next.set("source", "benchmark");
      else next.delete("source");
      const suffix = next.toString() ? `?${next.toString()}` : "";
      router.push(`${pathname}${suffix}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="border-border bg-surface-muted flex items-center gap-1 rounded-lg border p-0.5">
      <button
        type="button"
        onClick={() => {
          setScope("default");
        }}
        aria-pressed={source === "default"}
        className={`text-caption rounded-md px-3 py-1.5 font-medium transition-colors ${source === "default" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
      >
        {defaultLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          setScope("benchmark");
        }}
        aria-pressed={source === "benchmark"}
        className={`text-caption rounded-md px-3 py-1.5 font-medium transition-colors ${source === "benchmark" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
      >
        {benchmarkLabel}
      </button>
    </div>
  );
}
