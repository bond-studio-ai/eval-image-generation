"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/ui/icons";
import type { StrategyListItem } from "@/lib/service-client";

export function StrategyDropdown({ value, strategies, onChange }: { value: string; strategies: StrategyListItem[]; onChange: (strategyId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = strategies.find((strategy) => strategy.id === value);

  // Focus the search field when it mounts (i.e. when the dropdown opens) via a
  // stable callback ref — no effect, and no autoFocus prop.
  const focusOnOpen = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query ? strategies.filter((strategy) => strategy.name.toLowerCase().includes(query)) : strategies;
    return list.slice(0, 30);
  }, [search, strategies]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (open) setSearch("");
          setOpen(!open);
        }}
        className={`bg-surface text-caption flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
          open ? "border-primary-400 ring-primary-400 ring-1" : "border-border hover:border-border-strong"
        }`}
      >
        <span className={`truncate ${selected ? "text-text-primary font-medium" : "text-text-disabled"}`}>{selected?.name ?? "Select strategy…"}</span>
        <ChevronDownIcon className={`text-text-disabled size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-border bg-surface absolute left-0 z-50 mt-1 w-full min-w-[240px] rounded-xl border shadow-xl">
          <div className="border-border-subtle border-b p-2">
            <div className="relative">
              <SearchIcon className="text-text-disabled absolute top-1/2 left-2.5 size-3 -translate-y-1/2" />
              <input
                ref={focusOnOpen}
                type="text"
                aria-label="Search strategies"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search strategies…"
                className="focus:border-primary-300 focus:ring-primary-300 border-border bg-surface-muted text-text-secondary placeholder:text-text-disabled focus:bg-surface text-caption w-full rounded-md border py-1.5 pr-3 pl-8 focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="text-text-muted text-caption px-3 py-2">No matching strategies</div>
            ) : (
              filtered.map((strategy) => (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => {
                    onChange(strategy.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`text-caption flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${value === strategy.id ? "bg-primary-50 text-primary-700 font-medium" : "text-text-secondary hover:bg-surface-muted"}`}
                >
                  <span className="truncate">{strategy.name}</span>
                  {value === strategy.id && <CheckIcon className="text-primary-600 ml-auto size-3.5 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
