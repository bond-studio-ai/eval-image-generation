'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Preset = { label: string; days: number };

const DATE_PRESETS: Preset[] = [
  { label: 'Today', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function fmtISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  onDateHover,
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
  const [lo, hi] =
    rangeStart && effectiveEnd
      ? rangeStart <= effectiveEnd
        ? [rangeStart, effectiveEnd]
        : [effectiveEnd, rangeStart]
      : [null, null];

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-[252px]">
      <p className="mb-2 text-center text-xs font-semibold text-gray-800">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="flex h-8 items-center justify-center text-[10px] font-medium text-gray-400"
          >
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

          let cellBg = '';
          if (isInRange) cellBg = 'bg-primary-50';
          if (isStart && hi && lo !== hi) cellBg = 'bg-gradient-to-r from-transparent via-primary-50 to-primary-50';
          if (isEnd && lo && lo !== hi) cellBg = 'bg-gradient-to-l from-transparent via-primary-50 to-primary-50';
          if (isStart && isEnd) cellBg = '';

          let dayClass =
            'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all cursor-pointer ';
          if (isSelected) {
            dayClass += 'bg-primary-600 font-semibold text-white shadow-sm';
          } else if (isToday) {
            dayClass += 'font-semibold text-primary-600 ring-1 ring-primary-300 hover:bg-primary-100';
          } else {
            dayClass += 'text-gray-700 hover:bg-gray-100';
          }

          return (
            <div key={iso} className={`flex items-center justify-center ${cellBg}`}>
              <button
                type="button"
                className={dayClass}
                onClick={() => onDateClick(iso)}
                onMouseEnter={() => onDateHover(iso)}
                onMouseLeave={() => onDateHover(null)}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
  onClear,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [picking, setPicking] = useState<'start' | 'end'>('start');
  const [rangeStart, setRangeStart] = useState<string | null>(from || null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(to || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  useEffect(() => {
    setRangeStart(from || null);
    setRangeEnd(to || null);
  }, [from, to]);

  useEffect(() => {
    if (showCustom) {
      setPicking('start');
      setRangeStart(from || null);
      setRangeEnd(to || null);
      if (from) {
        const d = new Date(from + 'T00:00:00');
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      } else {
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCustom]);

  useEffect(() => {
    if (!showCustom) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustom]);

  const handleDateClick = useCallback(
    (iso: string) => {
      if (picking === 'start') {
        setRangeStart(iso);
        setRangeEnd(null);
        setPicking('end');
      } else {
        if (rangeStart && iso < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(iso);
        } else {
          setRangeEnd(iso);
        }
        setPicking('start');
      }
    },
    [picking, rangeStart],
  );

  const nextMonth = (viewMonth + 1) % 12;
  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const goPrev = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goNext = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const handleApply = useCallback(() => {
    if (rangeStart && rangeEnd) {
      const [lo, hi] = rangeStart <= rangeEnd ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
      onChange(lo, hi);
      setShowCustom(false);
    }
  }, [rangeStart, rangeEnd, onChange]);

  const activePreset =
    from && to ? DATE_PRESETS.find((p) => matchesPreset(from, to, p.days)) : null;
  const hasCustomRange = from && to && !activePreset;
  const hasDateFilter = !!(from || to);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => {
              const range = getPresetRange(preset.days);
              onChange(range.from, range.to);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activePreset?.days === preset.days
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}

        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              hasCustomRange
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : showCustom
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            {hasCustomRange ? `${formatDisplay(from)} – ${formatDisplay(to)}` : 'Custom'}
          </button>

          {showCustom && (
            <div className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-gray-200 bg-white shadow-xl">
              {/* Header with nav */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>
                <p className="text-xs font-medium text-gray-500">
                  {picking === 'end' && rangeStart
                    ? `Select end date`
                    : 'Select start date'}
                </p>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              </div>

              {/* Calendars */}
              <div className="flex gap-4 p-4">
                <CalendarMonth
                  year={viewYear}
                  month={viewMonth}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  hoverDate={picking === 'end' ? hoverDate : null}
                  onDateClick={handleDateClick}
                  onDateHover={setHoverDate}
                />
                <div className="w-px bg-gray-100" />
                <CalendarMonth
                  year={nextYear}
                  month={nextMonth}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  hoverDate={picking === 'end' ? hoverDate : null}
                  onDateClick={handleDateClick}
                  onDateHover={setHoverDate}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {rangeStart && (
                    <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700">
                      {formatDisplay(rangeStart)}
                    </span>
                  )}
                  {rangeStart && (
                    <svg
                      className="h-3 w-3 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  )}
                  {rangeEnd && (
                    <span className="rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-700">
                      {formatDisplay(rangeEnd)}
                    </span>
                  )}
                  {!rangeStart && !rangeEnd && (
                    <span className="text-gray-400">Pick a start date</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCustom(false)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!rangeStart || !rangeEnd}
                    className="rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {hasDateFilter && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Clear date filter"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
