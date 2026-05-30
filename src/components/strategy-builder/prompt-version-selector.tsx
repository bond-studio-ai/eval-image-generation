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
        className="focus:border-primary-500 focus:ring-primary-500 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-gray-400 focus:ring-1 focus:outline-none"
      >
        <span className={selectedName ? "text-gray-900" : "text-gray-400"}>{selectedName || "-- Select --"}</span>
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
                placeholder="Filter prompts..."
                aria-label="Filter prompts"
                className="focus:border-primary-500 focus:ring-primary-500 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                -- None --
              </button>
              {filtered.length === 0 && <div className="p-3 text-center text-sm text-gray-400">No matches</div>}
              {filtered.map((pv) => (
                <button
                  key={pv.id}
                  type="button"
                  onClick={() => {
                    onChange(pv.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${pv.id === value ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700"}`}
                >
                  <span className="truncate">{pv.name || "Untitled"}</span>
                  {pv.stats?.generationCount ? <span className="ml-auto shrink-0 text-xs text-gray-400">{pv.stats.generationCount} gen</span> : null}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
