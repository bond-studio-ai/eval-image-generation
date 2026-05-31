"use client";

import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { CheckIcon, ChevronsUpDownIcon } from "@/components/ui/icons";

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Optional secondary text shown to the right of the label. */
  meta?: string;
  /** Extra terms to match against when filtering (e.g. prompt bodies). */
  keywords?: string[];
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Render a leading "none" entry that clears the selection. */
  includeNone?: boolean;
  noneLabel?: string;
  /** Classes merged onto the trigger button. */
  triggerClassName?: string;
}

const TRIGGER_CLASS =
  "focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface hover:border-border-strong text-body flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus:ring-1 focus:outline-none";

const ITEM_CLASS = "text-body text-text-secondary data-[selected=true]:bg-surface-muted flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors data-[disabled=true]:pointer-events-none";

/**
 * Searchable single-select dropdown built on Radix Popover + cmdk. Replaces the
 * several near-identical hand-rolled "button + filter input + option list +
 * click-outside" dropdowns. cmdk owns the fuzzy filtering (matching `label`,
 * `meta`, and any `keywords`); Radix owns positioning, focus, and dismissal.
 */
export function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches",
  includeNone = false,
  noneLabel = "-- None --",
  triggerClassName
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" id={id} className={cn(TRIGGER_CLASS, triggerClassName)}>
          <span className={selected ? "text-text-primary truncate" : "text-text-disabled truncate"}>{selected?.label ?? placeholder}</span>
          <ChevronsUpDownIcon className="text-text-disabled size-4 shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="border-border bg-surface z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border shadow-lg">
          <Command>
            <div className="p-2">
              <Command.Input placeholder={searchPlaceholder} className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-body w-full rounded border px-2.5 py-1.5 focus:ring-1 focus:outline-none" />
            </div>
            <Command.List className="border-border-subtle max-h-56 overflow-y-auto border-t">
              <Command.Empty className="text-text-disabled text-body p-3 text-center">{emptyMessage}</Command.Empty>
              {includeNone && (
                <Command.Item
                  value="__none__"
                  onSelect={() => {
                    select("");
                  }}
                  className={ITEM_CLASS}
                >
                  <span className="text-text-disabled">{noneLabel}</span>
                </Command.Item>
              )}
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.meta ? [option.meta] : []), ...(option.keywords ?? [])]}
                  onSelect={() => {
                    select(option.value);
                  }}
                  className={cn(ITEM_CLASS, option.value === value && "bg-primary-50 text-primary-700 font-medium")}
                >
                  <span className="truncate">{option.label}</span>
                  {option.meta && <span className="text-text-disabled text-caption ml-auto shrink-0 font-mono">{option.meta}</span>}
                  {option.value === value && <CheckIcon className="text-primary-600 ml-auto size-3.5 shrink-0" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
