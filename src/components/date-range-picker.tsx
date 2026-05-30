"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";

type Preset = { label: string; days: number };

const DATE_PRESETS: Preset[] = [
  { label: "Today", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 }
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function fmtISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function isSame(a: string, b: string) {
  return a === b;
}
function isBetween(date: string, start: string, end: string) {
  return date > start && date < end;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function startOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function CalendarMonth({
  year,
  month,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateClick,
  onDateHover
}: {
  year: number;
  month: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  hoverDate: string | null;
  onDateClick: (iso: string) => void;
  onDateHover: (iso: string | null) => void;
}) {
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const leadingBlanks = startOfWeek(days[0]);
  const today = fmtISO(new Date());

  const effectiveEnd = rangeEnd ?? hoverDate;
  const [lo, hi] = rangeStart && effectiveEnd ? (rangeStart <= effectiveEnd ? [rangeStart, effectiveEnd] : [effectiveEnd, rangeStart]) : [null, null];

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="w-[252px]">
      <p className="text-text-secondary text-caption mb-2 text-center font-semibold">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-text-disabled flex h-8 items-center justify-center text-[10px] font-medium">
            {wd}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-8" />
        ))}
        {days.map((d) => {
          const iso = fmtISO(d);
          const isStart = lo != null && isSame(iso, lo);
          const isEnd = hi != null && isSame(iso, hi);
          const isInRange = lo != null && hi != null && isBetween(iso, lo, hi);
          const isToday = iso === today;
          const isSelected = isStart || isEnd;

          let cellBg = "";
          if (isInRange) cellBg = "bg-primary-50";
          if (isStart && hi && lo !== hi) cellBg = "bg-gradient-to-r from-transparent via-primary-50 to-primary-50";
          if (isEnd && lo && lo !== hi) cellBg = "bg-gradient-to-l from-transparent via-primary-50 to-primary-50";
          if (isStart && isEnd) cellBg = "";

          let dayClass = "relative z-10 flex size-8 items-center justify-center rounded-full text-caption transition-all cursor-pointer ";
          if (isSelected) {
            dayClass += "bg-primary-600 font-semibold text-text-inverse shadow-sm";
          } else if (isToday) {
            dayClass += "font-semibold text-primary-600 ring-1 ring-primary-300 hover:bg-primary-100";
          } else {
            dayClass += "text-text-secondary hover:bg-surface-sunken";
          }

          return (
            <div key={iso} className={`flex items-center justify-center ${cellBg}`}>
              <button type="button" className={dayClass} onClick={() => onDateClick(iso)} onMouseEnter={() => onDateHover(iso)} onMouseLeave={() => onDateHover(null)}>
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CalState = {
  picking: "start" | "end";
  rangeStart: string | null;
  rangeEnd: string | null;
  hoverDate: string | null;
  viewMonth: number;
  viewYear: number;
};

type CalAction =
  | { type: "syncRange"; from: string; to: string }
  | { type: "open"; from: string; to: string; viewMonth: number; viewYear: number }
  | { type: "pickDate"; iso: string }
  | { type: "setHover"; value: string | null }
  | { type: "prevMonth" }
  | { type: "nextMonth" };

function initCal({ from, to }: { from: string; to: string }): CalState {
  const now = new Date();
  return {
    picking: "start",
    rangeStart: from || null,
    rangeEnd: to || null,
    hoverDate: null,
    viewMonth: now.getMonth(),
    viewYear: now.getFullYear()
  };
}

function calReducer(state: CalState, action: CalAction): CalState {
  switch (action.type) {
    case "syncRange":
      return { ...state, rangeStart: action.from || null, rangeEnd: action.to || null };
    case "open":
      return {
        ...state,
        picking: "start",
        rangeStart: action.from || null,
        rangeEnd: action.to || null,
        viewYear: action.viewYear,
        viewMonth: action.viewMonth
      };
    case "pickDate": {
      if (state.picking === "start") {
        return { ...state, rangeStart: action.iso, rangeEnd: null, picking: "end" };
      }
      if (state.rangeStart && action.iso < state.rangeStart) {
        return { ...state, rangeEnd: state.rangeStart, rangeStart: action.iso, picking: "start" };
      }
      return { ...state, rangeEnd: action.iso, picking: "start" };
    }
    case "setHover":
      return { ...state, hoverDate: action.value };
    case "prevMonth":
      return state.viewMonth === 0 ? { ...state, viewMonth: 11, viewYear: state.viewYear - 1 } : { ...state, viewMonth: state.viewMonth - 1 };
    case "nextMonth":
      return state.viewMonth === 11 ? { ...state, viewMonth: 0, viewYear: state.viewYear + 1 } : { ...state, viewMonth: state.viewMonth + 1 };
  }
}

export function DateRangePicker({ from, to, onChange, onClear }: { from: string; to: string; onChange: (from: string, to: string) => void; onClear: () => void }) {
  const [showCustom, setShowCustom] = useState(false);
  const [cal, dispatchCal] = useReducer(calReducer, { from, to }, initCal);
  const popoverRef = useRef<HTMLDivElement>(null);

  const now = new Date();

  useEffect(() => {
    dispatchCal({ type: "syncRange", from, to });
  }, [from, to]);

  const toggleCustom = () => {
    if (!showCustom) {
      const d = from ? new Date(from + "T00:00:00") : now;
      dispatchCal({
        type: "open",
        from,
        to,
        viewYear: d.getFullYear(),
        viewMonth: d.getMonth()
      });
    }
    setShowCustom((prev) => !prev);
  };

  useEffect(() => {
    if (!showCustom) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustom]);

  const handleDateClick = useCallback((iso: string) => {
    dispatchCal({ type: "pickDate", iso });
  }, []);

  const nextMonth = (cal.viewMonth + 1) % 12;
  const nextYear = cal.viewMonth === 11 ? cal.viewYear + 1 : cal.viewYear;

  const goPrev = useCallback(() => {
    dispatchCal({ type: "prevMonth" });
  }, []);

  const goNext = useCallback(() => {
    dispatchCal({ type: "nextMonth" });
  }, []);

  const handleApply = useCallback(() => {
    if (cal.rangeStart && cal.rangeEnd) {
      const [lo, hi] = cal.rangeStart <= cal.rangeEnd ? [cal.rangeStart, cal.rangeEnd] : [cal.rangeEnd, cal.rangeStart];
      onChange(lo, hi);
      setShowCustom(false);
    }
  }, [cal.rangeStart, cal.rangeEnd, onChange]);

  const activePreset = from && to ? DATE_PRESETS.find((p) => matchesPreset(from, to, p.days)) : null;
  const hasCustomRange = from && to && !activePreset;
  const hasDateFilter = !!(from || to);

  return (
    <div className="flex items-center gap-1.5">
      <div className="border-border bg-surface-muted flex items-center rounded-lg border p-0.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => {
              const range = getPresetRange(preset.days);
              onChange(range.from, range.to);
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
              hasCustomRange ? "bg-surface text-text-primary ring-border shadow-sm ring-1" : showCustom ? "bg-surface text-text-primary ring-border shadow-sm ring-1" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <CalendarIcon className="size-3.5" />
            {hasCustomRange ? `${formatDisplay(from)} – ${formatDisplay(to)}` : "Custom"}
          </button>

          {showCustom && (
            <div className="border-border bg-surface absolute top-full right-0 z-50 mt-2 rounded-xl border shadow-xl">
              {/* Header with nav */}
              <div className="border-border-subtle flex items-center justify-between border-b px-4 pt-4 pb-2">
                <button type="button" onClick={goPrev} aria-label="Previous month" className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-lg p-1.5 transition-colors">
                  <ChevronLeftIcon className="size-4" />
                </button>
                <p className="text-text-muted text-caption font-medium">{cal.picking === "end" && cal.rangeStart ? `Select end date` : "Select start date"}</p>
                <button type="button" onClick={goNext} aria-label="Next month" className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-lg p-1.5 transition-colors">
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>

              {/* Calendars */}
              <div className="flex gap-4 p-4">
                <CalendarMonth
                  year={cal.viewYear}
                  month={cal.viewMonth}
                  rangeStart={cal.rangeStart}
                  rangeEnd={cal.rangeEnd}
                  hoverDate={cal.picking === "end" ? cal.hoverDate : null}
                  onDateClick={handleDateClick}
                  onDateHover={(value) => dispatchCal({ type: "setHover", value })}
                />
                <div className="bg-surface-sunken w-px" />
                <CalendarMonth
                  year={nextYear}
                  month={nextMonth}
                  rangeStart={cal.rangeStart}
                  rangeEnd={cal.rangeEnd}
                  hoverDate={cal.picking === "end" ? cal.hoverDate : null}
                  onDateClick={handleDateClick}
                  onDateHover={(value) => dispatchCal({ type: "setHover", value })}
                />
              </div>

              {/* Footer */}
              <div className="border-border-subtle flex items-center justify-between border-t px-4 py-3">
                <div className="text-text-muted text-caption flex items-center gap-2">
                  {cal.rangeStart && <span className="bg-surface-sunken text-text-secondary rounded-md px-2 py-1 font-medium">{formatDisplay(cal.rangeStart)}</span>}
                  {cal.rangeStart && <ArrowRightIcon className="text-text-disabled size-3" />}
                  {cal.rangeEnd && <span className="bg-surface-sunken text-text-secondary rounded-md px-2 py-1 font-medium">{formatDisplay(cal.rangeEnd)}</span>}
                  {!cal.rangeStart && !cal.rangeEnd && <span className="text-text-disabled">Pick a start date</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCustom(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleApply} disabled={!cal.rangeStart || !cal.rangeEnd}>
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
