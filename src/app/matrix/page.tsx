'use client';

import { StrategyMatrix } from '@/components/strategy-matrix';

export default function MatrixPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matrix</h1>
        <p className="mt-1 text-sm text-gray-600">
          Preset × strategy grid with outputs and evaluation status.
        </p>
      </div>
      <StrategyMatrix />
    </div>
  );
}
