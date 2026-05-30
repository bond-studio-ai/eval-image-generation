"use client";

import { DateRangePicker } from "@/components/date-range-picker";
import { CalendarIcon, ChevronDownIcon, ListIcon, SparklesIcon, XIcon } from "@/components/ui/icons";
import type { ApplyFilters } from "./types";

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All runs" },
  { value: "preset", label: "Preset runs" },
  { value: "raw_input", label: "Real Input runs" },
  { value: "benchmark", label: "Benchmark runs" }
] as const;

function formatDisplay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PrimaryFiltersProps {
  models: string[];
  isCompare: boolean;
  from: string;
  to: string;
  model: string;
  source: string;
  hasDateFilter: boolean;
  hasAnyFilter: boolean;
  applyFilters: ApplyFilters;
  clearAll: () => void;
}

export function PrimaryFilters({ models, isCompare, from, to, model, source, hasDateFilter, hasAnyFilter, applyFilters, clearAll }: PrimaryFiltersProps) {
  return (
    <>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {!isCompare && <DateRangePicker from={from} to={to} onChange={(f, t) => applyFilters({ from: f, to: t })} onClear={() => applyFilters({ from: "", to: "" })} />}

        {models.length > 0 && !isCompare && <div className="bg-border h-6 w-px" />}

        {models.length > 0 && !isCompare && (
          <div className="relative">
            <select
              value={model}
              onChange={(e) => applyFilters({ model: e.target.value })}
              className={`focus:ring-primary-100 text-caption appearance-none rounded-lg border py-1.5 pr-8 pl-3 font-medium transition-all focus:ring-2 focus:outline-none ${
                model ? "border-primary-200 bg-primary-50 text-primary-700" : "border-border bg-surface-muted text-text-secondary hover:bg-surface-sunken"
              }`}
            >
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon className="text-text-disabled size-3.5" />
            </div>
          </div>
        )}

        {!isCompare && (
          <>
            <div className="bg-border h-6 w-px" />
            <div className="border-border bg-surface-muted flex items-center gap-1 rounded-md border p-1">
              {SOURCE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyFilters({ source: option.value })}
                  className={`text-caption rounded px-2.5 py-1.5 font-medium transition-colors ${source === option.value ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {!isCompare && hasAnyFilter && (
          <>
            <div className="bg-border h-6 w-px" />
            <button type="button" onClick={clearAll} className="text-danger-500 hover:bg-danger-50 hover:text-danger-600 text-caption flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors">
              <XIcon className="size-3.5" />
              Reset
            </button>
          </>
        )}
      </div>

      {/* ── Active filter pills (non-comparison) ── */}
      {!isCompare && hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5">
          {hasDateFilter && (
            <span className="bg-primary-50 text-primary-700 ring-primary-200/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1">
              <CalendarIcon className="size-3" />
              {from && to ? `${formatDisplay(from)} – ${formatDisplay(to)}` : from ? `From ${formatDisplay(from)}` : `Until ${formatDisplay(to)}`}
              <button type="button" aria-label="Remove date filter" onClick={() => applyFilters({ from: "", to: "" })} className="hover:bg-primary-200/60 ml-0.5 rounded-full p-0.5 transition-colors">
                <XIcon className="size-2.5" />
              </button>
            </span>
          )}
          {model && (
            <span className="bg-accent-50 text-accent-700 ring-accent-200/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1">
              <SparklesIcon className="size-3" />
              {model}
              <button type="button" aria-label="Remove model filter" onClick={() => applyFilters({ model: "" })} className="hover:bg-accent-200/60 ml-0.5 rounded-full p-0.5 transition-colors">
                <XIcon className="size-2.5" />
              </button>
            </span>
          )}
          {source !== "all" && (
            <span className="bg-primary-50 text-primary-700 ring-primary-200/60 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1">
              <ListIcon className="size-3" />
              {SOURCE_FILTER_OPTIONS.find((option) => option.value === source)?.label ?? source}
              <button type="button" aria-label="Remove source filter" onClick={() => applyFilters({ source: "all" })} className="hover:bg-primary-200/60 ml-0.5 rounded-full p-0.5 transition-colors">
                <XIcon className="size-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </>
  );
}
