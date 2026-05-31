"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronsUpDownIcon } from "@/components/ui/icons";
import type { ModelOption } from "./types";

export function SearchableSelect({ id, value, options, onChange, placeholder = "-- Select --" }: { id?: string; value: string; options: ModelOption[]; onChange: (value: string) => void; placeholder?: string }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const selectedLabel = useMemo(() => options.find((option) => option.value === value)?.label ?? null, [options, value]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query));
  }, [options, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => {
          setOpen(!open);
        }}
        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface hover:border-border-strong text-body flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus:ring-1 focus:outline-none"
      >
        <span className={selectedLabel ? "text-text-primary truncate" : "text-text-disabled"}>{selectedLabel || placeholder}</span>
        <ChevronsUpDownIcon className="text-text-disabled size-4 shrink-0" />
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
          <div className="border-border bg-surface absolute z-50 mt-1 w-full rounded-lg border shadow-lg">
            <div className="p-2">
              <input
                ref={focusOnMount}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
                placeholder="Search models..."
                aria-label="Search models"
                className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded border px-2.5 py-1.5 focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="border-border-subtle max-h-56 overflow-y-auto border-t">
              {filtered.length === 0 && <div className="text-text-disabled text-body p-3 text-center">No matches</div>}
              {filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`hover:bg-surface-muted flex w-full flex-col px-3 py-2 text-left transition-colors ${option.value === value ? "bg-primary-50 text-primary-700" : "text-text-secondary"}`}
                >
                  <span className={`text-body ${option.value === value ? "font-medium" : ""}`}>{option.label}</span>
                  <span className="text-text-disabled text-caption font-mono">{option.meta ?? option.value}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
