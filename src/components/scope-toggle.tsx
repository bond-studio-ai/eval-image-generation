"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";

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
    <SegmentedControl<"default" | "benchmark">
      label="Data scope"
      value={source}
      onChange={setScope}
      options={[
        { value: "default", label: defaultLabel },
        { value: "benchmark", label: benchmarkLabel }
      ]}
    />
  );
}
