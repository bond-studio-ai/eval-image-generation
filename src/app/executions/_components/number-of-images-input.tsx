"use client";

import { useCallback, useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

export function NumberOfImagesInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const isDefault = value === null;
  const isPreset = !isDefault && [1, 2, 4, 8].includes(value);
  const [customImages, setCustomImages] = useState(!isDefault && !isPreset);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const activeCls = "border-primary-500 bg-primary-50 text-primary-700 shadow-sm";
  const inactiveCls = "border-border-strong bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted";

  return (
    <div className="flex items-center gap-3">
      <span className="text-text-secondary text-body font-medium">Number of images</span>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setCustomImages(false);
          }}
          className={`text-body flex h-8 items-center justify-center rounded-lg border px-2.5 font-medium transition-all ${isDefault ? activeCls : inactiveCls}`}
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
            className={`text-body flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-2.5 font-medium transition-all ${!isDefault && !customImages && value === n ? activeCls : inactiveCls}`}
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
          className={`text-body flex h-8 items-center justify-center rounded-lg border px-2.5 font-medium transition-all ${customImages ? activeCls : inactiveCls}`}
        >
          Custom
        </button>
        {customImages && (
          <div className="border-border-strong bg-surface inline-flex h-8 items-center rounded-lg border shadow-sm">
            <button
              type="button"
              onClick={() => onChange(Math.max(1, (value ?? 1) - 1))}
              disabled={(value ?? 1) <= 1}
              aria-label="Decrease image count"
              className="border-border-strong text-text-muted hover:bg-surface-sunken disabled:hover:bg-surface flex size-8 items-center justify-center rounded-l-lg border-r disabled:opacity-30"
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
              onChange={(e) => onChange(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
              className="text-text-primary text-body h-8 w-12 [appearance:textfield] border-none bg-transparent text-center font-semibold focus:ring-0 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => onChange(Math.min(100, (value ?? 1) + 1))}
              disabled={(value ?? 1) >= 100}
              aria-label="Increase image count"
              className="border-border-strong text-text-muted hover:bg-surface-sunken disabled:hover:bg-surface flex size-8 items-center justify-center rounded-r-lg border-l disabled:opacity-30"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
