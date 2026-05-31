"use client";

import { useCallback, useState } from "react";
import { CANDIDATE_PRESETS } from "./types";

export function CandidatePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const isPreset = CANDIDATE_PRESETS.includes(value as 1 | 2 | 4 | 8);
  const [custom, setCustom] = useState(!isPreset);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const activeCls = "bg-warning-600 text-text-inverse shadow-sm";
  const inactiveCls = "bg-surface text-warning-800 ring-1 ring-warning-300 hover:bg-warning-50";
  const btnBase = "min-w-[1.75rem] rounded-md px-1.5 py-1 text-caption font-semibold transition-colors";

  return (
    <div className="flex items-center gap-2">
      <span className="text-warning-800 text-caption font-medium">Candidates:</span>
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
        <button
          type="button"
          onClick={() => {
            setCustom(true);
          }}
          className={`${btnBase} ${custom ? activeCls : inactiveCls}`}
        >
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
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 100) onChange(parsed);
              else if (e.target.value === "") onChange(1);
            }}
            className="border-warning-300 bg-surface text-warning-900 focus:border-warning-500 focus:ring-warning-500 text-caption w-12 [appearance:textfield] rounded-md border px-1.5 py-1 text-center font-semibold focus:ring-1 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}
      </div>
    </div>
  );
}
