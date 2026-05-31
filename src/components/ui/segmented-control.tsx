"use client";

import { type KeyboardEvent, useCallback, useMemo, useRef } from "react";
import { cn } from "./cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

const SIZE = {
  sm: "p-0.5 [&_button]:px-2.5 [&_button]:py-1 [&_button]:text-[11px]",
  md: "p-1 [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-caption"
};

/**
 * Pill-style segmented control implemented as an ARIA radiogroup.
 *
 * Keyboard model (matches the WAI-ARIA radio-group pattern):
 * - Tab moves focus into the group, landing on the currently selected option
 *   (or the first enabled option if no value matches).
 * - ArrowRight/ArrowDown move to the next enabled option, ArrowLeft/ArrowUp
 *   move to the previous, Home/End jump to the first/last enabled option.
 *   Each move both selects and focuses the new option (so reading order and
 *   selection stay aligned, like a native radio group).
 * - Enter/Space on a focused option selects it (default button behavior).
 *
 * Use for binary or low-cardinality view-mode toggles (List/Matrix, source
 * filter, etc.). For route navigation between pages, prefer `<Tabs>`.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, size = "md", className, label }: SegmentedControlProps<T>) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndices = useMemo(() => options.map((opt, i) => (opt.disabled ? -1 : i)).filter((i): i is number => i >= 0), [options]);

  // The single tab-stop. If `value` doesn't match any enabled option, fall back
  // to the first enabled option so keyboard users can still enter the group.
  const activeIndex = options.findIndex((opt) => opt.value === value && !opt.disabled);
  const tabStopIndex = activeIndex === -1 ? (enabledIndices[0] ?? -1) : activeIndex;

  const moveTo = useCallback(
    (nextIndex: number | undefined) => {
      if (nextIndex === undefined) return;
      const opt = options[nextIndex];
      if (!opt || opt.disabled) return;
      onChange(opt.value);
      buttonsRef.current[nextIndex]?.focus();
    },
    [options, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (enabledIndices.length === 0) return;
      const pos = enabledIndices.indexOf(currentIndex);
      if (pos === -1) return;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          const next = enabledIndices[(pos + 1) % enabledIndices.length];
          moveTo(next);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          const prev = enabledIndices[(pos - 1 + enabledIndices.length) % enabledIndices.length];
          moveTo(prev);
          break;
        }
        case "End": {
          e.preventDefault();
          moveTo(enabledIndices.at(-1));
          break;
        }
        case "Home": {
          e.preventDefault();
          moveTo(enabledIndices[0]);
          break;
        }
        default: {
          break;
        }
      }
    },
    [enabledIndices, moveTo]
  );

  return (
    <div role="radiogroup" aria-label={label} className={cn("rounded-button border-border bg-surface-sunken inline-flex border", SIZE[size], className)}>
      {options.map((opt, index) => {
        const isActive = opt.value === value;
        const isTabStop = index === tabStopIndex;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isTabStop ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value);
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, index);
            }}
            className={cn(
              "rounded-md font-medium transition-colors",
              "focus-visible:outline-primary-600 focus-visible:outline-2 focus-visible:outline-offset-1",
              isActive ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary",
              opt.disabled && "opacity-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
