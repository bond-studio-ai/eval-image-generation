'use client';

import type { StrategyListItem } from '@/lib/service-client';
import { useEffect, useMemo, useRef, useState } from 'react';

export function StrategyDropdown({
  value,
  strategies,
  onChange,
}: {
  value: string;
  strategies: StrategyListItem[];
  onChange: (strategyId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = strategies.find((s) => s.id === value);

  useEffect(() => {
    if (open) searchInputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? strategies.filter((s) => s.name.toLowerCase().includes(q)) : strategies;
    return list.slice(0, 30);
  }, [search, strategies]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (open) setSearch('');
          setOpen(!open);
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left text-xs transition-colors ${
          open
            ? 'border-primary-400 ring-primary-400 ring-1'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`truncate ${selected ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
          {selected?.name ?? 'Select strategy…'}
        </span>
        <svg
          className={`size-3.5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[240px] rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <svg
                className="absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Search strategies"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search strategies…"
                className="focus:border-primary-300 focus:ring-primary-300 w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pr-3 pl-8 text-xs text-gray-700 placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No matching strategies</div>
            ) : (
              filtered.map((strategy) => (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => {
                    onChange(strategy.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    value === strategy.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{strategy.name}</span>
                  {value === strategy.id && (
                    <svg
                      className="text-primary-600 ml-auto size-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
