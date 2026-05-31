"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { RunPicker } from "./_components/run-picker";
import { CompareView } from "./compare-view";
import { SingleRunAuditView } from "./single-run-audit-view";

export function AuditComparePage() {
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (leftId === id) {
      setLeftId(null);
    } else if (rightId === id) {
      setRightId(null);
    } else if (!leftId) {
      setLeftId(id);
    } else if (rightId) {
      setRightId(id);
    } else {
      setRightId(id);
    }
  };

  const canCompare = leftId && rightId;

  return (
    <div>
      <PageHeader title="Audit" subtitle="Select one run to inspect its audit data, or two runs to compare side by side." />

      <RunPicker
        leftId={leftId}
        rightId={rightId}
        onToggle={toggle}
        onClearLeft={() => {
          setLeftId(null);
        }}
        onClearRight={() => {
          setRightId(null);
        }}
        onClearAll={() => {
          setLeftId(null);
          setRightId(null);
        }}
      />

      {canCompare && (
        <div className="mt-8">
          <CompareView leftId={leftId} rightId={rightId} />
        </div>
      )}

      {!canCompare && (leftId || rightId) && (
        <div className="mt-8">
          <SingleRunAuditView runId={(leftId ?? rightId)!} />
        </div>
      )}
    </div>
  );
}
