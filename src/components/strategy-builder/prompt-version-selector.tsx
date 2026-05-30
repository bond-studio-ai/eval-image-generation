"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronsUpDownIcon } from "@/components/ui/icons";
import type { PromptVersionListItem } from "@/lib/types";

export function PromptVersionSelector({ value, id, promptVersions, onChange }: { id?: string; value: string; promptVersions: PromptVersionListItem[]; onChange: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const selectedName = useMemo(() => promptVersions.find((pv) => pv.id === value)?.name || null, [promptVersions, value]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return promptVersions;
    return promptVersions.filter((pv) => (pv.name ?? "").toLowerCase().includes(q) || (pv.systemPrompt ?? "").toLowerCase().includes(q) || (pv.userPrompt ?? "").toLowerCase().includes(q));
  }, [promptVersions, search]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface hover:border-border-strong text-body flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus:ring-1 focus:outline-none"
      >
        <span className={selectedName ? "text-text-primary" : "text-text-disabled"}>{selectedName || "-- Select --"}</span>
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter prompts..."
                aria-label="Filter prompts"
                className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded border px-2.5 py-1.5 focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="border-border-subtle max-h-56 overflow-y-auto border-t">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="text-text-disabled hover:bg-surface-muted text-body w-full px-3 py-2 text-left"
              >
                -- None --
              </button>
              {filtered.length === 0 && <div className="text-text-disabled text-body p-3 text-center">No matches</div>}
              {filtered.map((pv) => (
                <button
                  key={pv.id}
                  type="button"
                  onClick={() => {
                    onChange(pv.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`hover:bg-surface-muted text-body flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${pv.id === value ? "bg-primary-50 text-primary-700 font-medium" : "text-text-secondary"}`}
                >
                  <span className="truncate">{pv.name || "Untitled"}</span>
                  {pv.stats?.generationCount ? <span className="text-text-disabled text-caption ml-auto shrink-0">{pv.stats.generationCount} gen</span> : null}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
