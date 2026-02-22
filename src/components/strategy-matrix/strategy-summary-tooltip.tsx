'use client';

import { useState, useRef } from 'react';
import type { StrategySummaryItem } from '@/hooks/matrix/strategy-matrix-types';

interface StrategySummaryTooltipProps {
  summary: StrategySummaryItem | null;
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function StrategySummaryTooltip({ summary }: StrategySummaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  if (!summary) {
    return (
      <span className="text-[11px] text-gray-500" title="No summary for this strategy">
        No data
      </span>
    );
  }

  const rows: { label: string; value: string | number }[] = [
    { label: 'Score', value: summary.globalPercentage != null ? `${summary.globalPercentage}%` : '—' },
    { label: 'Presets covered', value: `${summary.presetsCovered} / ${summary.totalPresets}` },
    { label: 'Coverage', value: `${Math.round(summary.coverageRatio * 100)}%` },
    { label: 'Avg execution time', value: formatMs(summary.avgExecutionTimeMs) },
    { label: 'Cost per image', value: formatMs(summary.costPerImageMs) },
    { label: 'Stability variance', value: summary.stabilityVariance != null ? summary.stabilityVariance.toFixed(4) : '—' },
  ];

  return (
    <div
      className="relative flex items-center gap-1"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span
        className="flex size-4 cursor-default items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        aria-label="Strategy summary"
      >
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </span>
      {open && (
        <div className="absolute left-1/2 top-full z-30 mt-1 min-w-[200px] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-lg">
          <div className="space-y-1 text-[11px]">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
