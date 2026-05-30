'use client';

import { useCallback, useState } from 'react';
import { MinusIcon, PlusIcon } from '@/components/ui/icons';

export function NumberOfImagesInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const isDefault = value === null;
  const isPreset = !isDefault && [1, 2, 4, 8].includes(value);
  const [customImages, setCustomImages] = useState(!isDefault && !isPreset);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const activeCls = 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm';
  const inactiveCls =
    'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50';

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Number of images</span>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setCustomImages(false);
          }}
          className={`flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${isDefault ? activeCls : inactiveCls}`}
        >
          Default
        </button>
        {[1, 2, 4, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(n);
              setCustomImages(false);
            }}
            className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${!isDefault && !customImages && value === n ? activeCls : inactiveCls}`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustomImages(true);
            if (isDefault || [1, 2, 4, 8].includes(value!)) onChange(3);
          }}
          className={`flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-all ${customImages ? activeCls : inactiveCls}`}
        >
          Custom
        </button>
        {customImages && (
          <div className="inline-flex h-8 items-center rounded-lg border border-gray-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => onChange(Math.max(1, (value ?? 1) - 1))}
              disabled={(value ?? 1) <= 1}
              aria-label="Decrease image count"
              className="flex size-8 items-center justify-center rounded-l-lg border-r border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              <MinusIcon className="size-3.5" />
            </button>
            <input
              ref={focusOnMount}
              type="number"
              min={1}
              max={100}
              aria-label="Image count"
              value={value ?? 1}
              onChange={(e) =>
                onChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))
              }
              className="h-8 w-12 [appearance:textfield] border-none bg-transparent text-center text-sm font-semibold text-gray-900 focus:ring-0 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange(Math.min(100, (value ?? 1) + 1))}
              disabled={(value ?? 1) >= 100}
              aria-label="Increase image count"
              className="flex size-8 items-center justify-center rounded-r-lg border-l border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
