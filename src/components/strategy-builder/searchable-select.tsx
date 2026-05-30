"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronsUpDownIcon } from "@/components/ui/icons";
import type { ModelOption } from "./types";

export function SearchableSelect({ id, value, options, onChange, placeholder = "-- Select --" }: { id?: string; value: string; options: ModelOption[]; onChange: (value: string) => void; placeholder?: string }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const selectedLabel = useMemo(() => options.find((o) => o.value === value)?.label ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="focus:border-primary-500 focus:ring-primary-500 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:ring-1 focus:outline-none"
      >
        <span className={selectedLabel ? "truncate text-gray-900" : "text-gray-400"}>{selectedLabel || placeholder}</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-40 cursor-pointer"
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <input
                ref={focusOnMount}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                aria-label="Search models"
                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border-t border-gray-100">
              {filtered.length === 0 && <div className="p-3 text-center text-sm text-gray-400">No matches</div>}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-gray-50 ${o.value === value ? "bg-primary-50 text-primary-700" : "text-gray-700"}`}
                >
                  <span className={`text-sm ${o.value === value ? "font-medium" : ""}`}>{o.label}</span>
                  <span className="font-mono text-xs text-gray-400">{o.meta ?? o.value}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
