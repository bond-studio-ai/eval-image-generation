"use client";

import * as Popover from "@radix-ui/react-popover";
import { type Table } from "@tanstack/react-table";
import { ChevronDownIcon, SlidersIcon } from "@/components/ui/icons";

/**
 * "Columns" show/hide menu for the DataTable, built on Radix Popover (mirrors
 * the SearchableSelect pattern). Lists every hideable leaf column as a checkbox
 * toggling its visibility; columns with `enableHiding: false` (select/actions)
 * are excluded.
 */
export function ColumnVisibilityMenu<T>({ table }: { table: Table<T> }) {
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide());
  if (hideable.length === 0) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="border-border-strong bg-surface text-body text-text-secondary hover:border-border-strong hover:bg-surface-muted focus:border-primary-500 focus:ring-primary-500 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors focus:ring-1 focus:outline-none"
        >
          <SlidersIcon className="text-text-disabled size-4" />
          Columns
          <ChevronDownIcon className="text-text-disabled size-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={4} className="border-border bg-surface z-50 min-w-44 overflow-hidden rounded-lg border p-1 shadow-lg">
          {hideable.map((column) => {
            const { header, meta } = column.columnDef;
            const label = meta?.label ?? (typeof header === "string" ? header : column.id);
            return (
              <label key={column.id} className="text-body text-text-secondary hover:bg-surface-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 select-none">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={() => {
                    column.toggleVisibility();
                  }}
                  className="border-border-strong text-primary-600 focus:ring-primary-500 size-4 cursor-pointer rounded"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
