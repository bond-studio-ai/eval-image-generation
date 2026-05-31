"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { type DateRange, DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";

interface Preset {
  label: string;
  days: number;
}

const DATE_PRESETS: Preset[] = [
  { label: "Today", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 }
];

function fmtISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDate(iso: string): Date | undefined {
  return iso ? new Date(`${iso}T00:00:00`) : undefined;
}

function formatDisplay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPresetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: fmtISO(from), to: fmtISO(to) };
}

function matchesPreset(from: string, to: string, days: number): boolean {
  const expected = getPresetRange(days);
  return from === expected.from && to === expected.to;
}

function rangeFromProps(from: string, to: string): DateRange | undefined {
  const fromDate = toDate(from);
  if (!fromDate) return undefined;
  return { from: fromDate, to: toDate(to) };
}

// Theme react-day-picker's accent/today colors with our design tokens.
const calendarThemeVars = {
  "--rdp-accent-color": "var(--color-primary-600)",
  "--rdp-accent-background-color": "var(--color-primary-50)",
  "--rdp-today-color": "var(--color-primary-600)",
  "--rdp-day-width": "2.25rem",
  "--rdp-day-height": "2.25rem"
} as CSSProperties;

export function DateRangePicker({ from, to, onChange, onClear }: { from: string; to: string; onChange: (from: string, to: string) => void; onClear: () => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() => rangeFromProps(from, to));
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRange(rangeFromProps(from, to));
  }, [from, to]);

  const toggleCustom = () => {
    if (!showCustom) setRange(rangeFromProps(from, to));
    setShowCustom((prev) => !prev);
  };

  useEffect(() => {
    if (!showCustom) return undefined;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [showCustom]);

  const handleApply = () => {
    if (range?.from && range.to) {
      onChange(fmtISO(range.from), fmtISO(range.to));
      setShowCustom(false);
    }
  };

  const activePreset = from && to ? DATE_PRESETS.find((preset) => matchesPreset(from, to, preset.days)) : null;
  const hasCustomRange = from && to && !activePreset;
  const hasDateFilter = Boolean(from || to);

  return (
    <div className="flex items-center gap-1.5">
      <div className="border-border bg-surface-muted flex items-center rounded-lg border p-0.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => {
              const presetRange = getPresetRange(preset.days);
              onChange(presetRange.from, presetRange.to);
            }}
            className={`text-caption rounded-md px-3 py-1.5 font-medium transition-all ${activePreset?.days === preset.days ? "bg-surface text-text-primary ring-border shadow-sm ring-1" : "text-text-muted hover:text-text-secondary"}`}
          >
            {preset.label}
          </button>
        ))}

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={toggleCustom}
            className={`text-caption flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-all ${
              hasCustomRange || showCustom ? "bg-surface text-text-primary ring-border shadow-sm ring-1" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <CalendarIcon className="size-3.5" />
            {hasCustomRange ? `${formatDisplay(from)} – ${formatDisplay(to)}` : "Custom"}
          </button>

          {showCustom && (
            <div className="border-border bg-surface absolute top-full right-0 z-50 mt-2 rounded-xl border shadow-xl">
              <div className="px-4 pt-3" style={calendarThemeVars}>
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={range?.from ?? new Date()}
                  selected={range}
                  onSelect={setRange}
                  components={{
                    Chevron: ({ orientation }) => (orientation === "left" ? <ChevronLeftIcon className="size-4" /> : <ChevronRightIcon className="size-4" />)
                  }}
                />
              </div>

              {/* Footer */}
              <div className="border-border-subtle flex items-center justify-between border-t px-4 py-3">
                <div className="text-text-muted text-caption flex items-center gap-2">
                  {range?.from && <span className="bg-surface-sunken text-text-secondary rounded-md px-2 py-1 font-medium">{formatDisplay(fmtISO(range.from))}</span>}
                  {range?.from && <ArrowRightIcon className="text-text-disabled size-3" />}
                  {range?.to && <span className="bg-surface-sunken text-text-secondary rounded-md px-2 py-1 font-medium">{formatDisplay(fmtISO(range.to))}</span>}
                  {!range?.from && !range?.to && <span className="text-text-disabled">Pick a start date</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCustom(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleApply} disabled={!range?.from || !range.to}>
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasDateFilter && (
        <button type="button" onClick={onClear} aria-label="Clear date filter" className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-md p-1 transition-colors" title="Clear date filter">
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
