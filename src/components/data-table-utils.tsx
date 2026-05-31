import { Fragment, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { CopyIcon, EditIcon, TrashIcon } from "@/components/ui/icons";
import type { ColumnDef, RowAction } from "./data-table";

// ---------------------------------------------------------------------------
// Column factories
// ---------------------------------------------------------------------------

const CHECKBOX_CLASS = "size-4 cursor-pointer rounded border-border-strong text-primary-600 focus:ring-primary-500";

export function checkboxColumn<T>({ selected, onToggle, rowId, isSelectable }: { selected: Set<string>; onToggle: (id: string) => void; rowId: (row: T) => string; isSelectable?: (row: T) => boolean }): ColumnDef<T> {
  return {
    id: "select",
    enableHiding: false,
    header: () => null,
    cell: ({ row }) => {
      if (isSelectable && !isSelectable(row.original)) return null;
      const id = rowId(row.original);
      return (
        <input
          type="checkbox"
          aria-label="Select row"
          checked={selected.has(id)}
          onChange={() => {
            onToggle(id);
          }}
          className={CHECKBOX_CLASS}
        />
      );
    },
    meta: { headerClassName: "w-10 p-3", cellClassName: "w-10 p-3" }
  };
}

// ---------------------------------------------------------------------------
// Actions column
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<"clone" | "delete" | "edit", ReactNode> = {
  clone: <CopyIcon className="size-4" />,
  delete: <TrashIcon className="size-4" />,
  edit: <EditIcon className="size-4" />
};

/**
 * Creates a right-aligned actions column from a list of action descriptors.
 *
 * Each action is either:
 * - `{ icon, label, onClick }` — renders as a standard `<IconButton>`
 * - `{ render }` — renders a custom component (escape hatch)
 */
export function actionsColumn<T>(actions: RowAction<T>[]): ColumnDef<T> {
  return {
    id: "actions",
    enableHiding: false,
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        {actions.map((action, i) => {
          if ("render" in action) {
            // eslint-disable-next-line react/no-array-index-key -- actions is a static config array (render hatch has no id), never reordered
            return <Fragment key={i}>{action.render(row.original)}</Fragment>;
          }
          if (action.hidden?.(row.original)) return null;
          const isLoading = action.loading?.(row.original) ?? false;
          return (
            <IconButton
              key={action.label}
              label={action.label}
              icon={ACTION_ICONS[action.icon]}
              variant={action.variant === "danger" ? "danger" : "default"}
              loading={isLoading}
              onClick={() => {
                action.onClick(row.original);
              }}
            />
          );
        })}
      </div>
    ),
    meta: { headerClassName: "relative px-6 py-3", cellClassName: "whitespace-nowrap px-6 py-4 text-right" }
  };
}
