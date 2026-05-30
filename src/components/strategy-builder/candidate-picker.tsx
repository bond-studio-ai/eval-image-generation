"use client";

import { useCallback, useState } from "react";
import { CANDIDATE_PRESETS } from "./types";

export function CandidatePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const isPreset = CANDIDATE_PRESETS.includes(value as 1 | 2 | 4 | 8);
  const [custom, setCustom] = useState(!isPreset);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const activeCls = "bg-amber-600 text-white shadow-sm";
  const inactiveCls = "bg-white text-amber-800 ring-1 ring-amber-300 hover:bg-amber-50";
  const btnBase = "min-w-[1.75rem] rounded-md px-1.5 py-1 text-xs font-semibold transition-colors";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-amber-800">Candidates:</span>
      <div className="flex items-center gap-1">
        {CANDIDATE_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(n);
            }}
            className={`${btnBase} ${!custom && value === n ? activeCls : inactiveCls}`}
          >
            {n}
          </button>
        ))}
        <button type="button" onClick={() => setCustom(true)} className={`${btnBase} ${custom ? activeCls : inactiveCls}`}>
          Custom
        </button>
        {custom && (
          <input
            ref={focusOnMount}
            type="text"
            inputMode="numeric"
            aria-label="Candidates"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v) && v >= 1 && v <= 100) onChange(v);
              else if (e.target.value === "") onChange(1);
            }}
            className="w-12 [appearance:textfield] rounded-md border border-amber-300 bg-white px-1.5 py-1 text-center text-xs font-semibold text-amber-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}
      </div>
    </div>
  );
}
