'use client';

import { DateRangePicker } from '@/components/date-range-picker';
import { SegmentedControl } from '@/components/ui/segmented-control';

export function BatchToolbar({
  from,
  to,
  onChange,
  onClear,
  viewMode,
  onViewModeChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
  viewMode: 'list' | 'matrix';
  onViewModeChange: (value: 'list' | 'matrix') => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <DateRangePicker from={from} to={to} onChange={onChange} onClear={onClear} />

      <SegmentedControl
        options={[
          { value: 'list', label: 'List' },
          { value: 'matrix', label: 'Matrix' },
        ]}
        value={viewMode}
        onChange={(v) => onViewModeChange(v)}
        size="sm"
        label="View mode"
      />
    </div>
  );
}
