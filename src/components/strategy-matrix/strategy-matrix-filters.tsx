'use client';

import { useState, useEffect, useRef } from 'react';
import type { StrategyMatrixParams } from '@/hooks/matrix/strategy-matrix-types';

const DEFAULT_MODELS: { value: string; label: string }[] = [
  { value: 'gemini-2.5-flash-image', label: 'Nano Banana' },
  { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
  { value: 'seedream-4.5', label: 'Seedream' },
];

const TEMP_DEBOUNCE_MS = 400;

interface StrategyMatrixFiltersProps {
  params: StrategyMatrixParams;
  onParamsChange: (next: Partial<StrategyMatrixParams>) => void;
}

const EMPTY_PARAMS: Partial<StrategyMatrixParams> = {
  model: undefined,
  minTemperature: undefined,
};

export function StrategyMatrixFilters({ params, onParamsChange }: StrategyMatrixFiltersProps) {
  const currentModel = params.model ?? '';
  const paramTemp = params.minTemperature ?? '';

  const [tempInput, setTempInput] = useState(paramTemp);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTempInput(paramTemp);
  }, [paramTemp]);

  const hasActiveFilters = currentModel !== '' || paramTemp !== '';

  const handleReset = () => {
    onParamsChange(EMPTY_PARAMS);
  };

  const removeTag = (key: keyof StrategyMatrixParams) => {
    onParamsChange({ [key]: undefined });
  };

  const handleTempChange = (value: string) => {
    setTempInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onParamsChange({ minTemperature: value.trim() || undefined });
    }, TEMP_DEBOUNCE_MS);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="strategy-matrix-model" className="text-xs font-medium text-gray-500">
            Model
          </label>
          <select
            id="strategy-matrix-model"
            value={currentModel}
            onChange={(e) => onParamsChange({ model: e.target.value || undefined })}
            className="h-9 w-[200px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">All models</option>
            {DEFAULT_MODELS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="strategy-matrix-temp" className="text-xs font-medium text-gray-500">
            Temp
          </label>
          <input
            id="strategy-matrix-temp"
            type="number"
            min={0}
            max={2}
            step={0.1}
            placeholder="0–2"
            value={tempInput}
            onChange={(e) => handleTempChange(e.target.value)}
            className="h-9 w-[100px] rounded-lg border border-gray-300 bg-white px-3 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Reset all
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Active:</span>
          {currentModel !== '' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Model: {DEFAULT_MODELS.find((m) => m.value === currentModel)?.label ?? currentModel}
              <button
                type="button"
                onClick={() => removeTag('model')}
                className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                aria-label="Remove model filter"
              >
                <svg className="size-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {paramTemp !== '' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              Temp: {paramTemp}
              <button
                type="button"
                onClick={() => removeTag('minTemperature')}
                className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                aria-label="Remove temp filter"
              >
                <svg className="size-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
