"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ScopeToggle } from "@/components/scope-toggle";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { BatchRunsTab } from "./batch-tab";
import { ExecutionsRunButton } from "./executions-run-button";

type ExecTab = "batches" | "generations";

export function ExecutionsTabs() {
  return (
    <Suspense fallback={null}>
      <ExecutionsTabsInner />
    </Suspense>
  );
}

function ExecutionsTabsInner() {
  const [refreshKey, setRefreshKey] = useState(0);
  const searchParams = useSearchParams();
  const source = searchParams.get("source") === "benchmark" ? "benchmark" : "default";

  const handleRunCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const sourceQs = source === "benchmark" ? "?source=benchmark" : "";
  const items: TabItem<ExecTab>[] = [
    { key: "batches", label: "Batches", href: `/executions${sourceQs}` },
    {
      key: "generations",
      label: "Generations",
      href: source === "benchmark" ? "/executions?tab=generations&source=benchmark" : "/executions?tab=generations"
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          title="Runs"
          subtitle={source === "benchmark" ? "Run benchmark projects and review benchmark image generations." : "Run strategies and browse generated images."}
          actions={
            <>
              <ScopeToggle />
              <ExecutionsRunButton onRunCreated={handleRunCreated} />
            </>
          }
        />
      </div>

      <div className="mb-6">
        <Tabs items={items} active="batches" label="Runs view" />
      </div>

      <BatchRunsTab refreshKey={refreshKey} source={source} />
    </div>
  );
}
