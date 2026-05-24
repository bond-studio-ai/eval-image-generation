import {
  Badge,
  CopyIcon,
  EditIcon,
  IconButton,
  SearchIcon,
  TrashIcon,
  type BadgeTone,
} from '@/components/ui';
import Link from 'next/link';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export interface DataTableColumn<T> {
  header: ReactNode;
  headerClassName?: string;
  cell: (row: T) => ReactNode;
  cellClassName?: string;
}

// ---------------------------------------------------------------------------
// Default class names — exported so consumers can compose overrides
// ---------------------------------------------------------------------------

export const TH_DEFAULT =
  'px-6 py-3 text-left text-caption font-medium uppercase tracking-wider text-text-secondary';

export const TD_DEFAULT = 'whitespace-nowrap px-6 py-4 text-body text-text-secondary';

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  rowClassName?: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  skeletonRows?: number;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6', 'w-2/5'];

function SkeletonRow({ colCount, rowIndex }: { colCount: number; rowIndex: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }, (_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`bg-surface-sunken h-4 animate-pulse rounded ${SKELETON_WIDTHS[(rowIndex + i) % SKELETON_WIDTHS.length]}`}
          />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowClassName,
  emptyMessage = 'No items found.',
  loading = false,
  skeletonRows = 5,
  toolbar,
  footer,
  className = 'mt-8',
}: DataTableProps<T>) {
  const colCount = columns.length;

  const lastRowCount = useRef(skeletonRows);
  useEffect(() => {
    if (data.length > 0) lastRowCount.current = data.length;
  }, [data.length]);
  const displaySkeletonRows = loading ? lastRowCount.current : 0;

  return (
    <div
      className={`rounded-card border-border bg-surface shadow-card overflow-clip border ${className}`}
    >
      {toolbar && (
        <div className="border-border bg-surface sticky top-0 z-10 border-b px-6 py-3">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="divide-border min-w-full divide-y">
          <thead className="bg-surface-muted">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={col.headerClassName ?? TH_DEFAULT}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border bg-surface divide-y">
            {loading ? (
              Array.from({ length: displaySkeletonRows }, (_, i) => (
                <SkeletonRow key={i} colCount={colCount} rowIndex={i} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="text-body text-text-muted px-6 py-6">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)} className={rowClassName?.(row) ?? 'hover:bg-surface-muted'}>
                  {columns.map((col, i) => (
                    <td key={i} className={col.cellClassName ?? TD_DEFAULT}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable cell components
// ---------------------------------------------------------------------------

export function NameCell({
  href,
  name,
  subtitle,
  fallback = 'Untitled',
}: {
  href: string;
  name: string | null;
  subtitle?: string | null;
  fallback?: string;
}) {
  return (
    <div>
      <Link href={href} className="text-body text-primary-600 hover:text-primary-500 font-medium">
        {name || fallback}
      </Link>
      {subtitle && (
        <p className="text-caption text-text-muted mt-0.5 max-w-xs truncate">{subtitle}</p>
      )}
    </div>
  );
}

const STATUS_TONE: Record<'active' | 'inactive' | 'deleted', BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  deleted: 'danger',
};

const STATUS_LABEL: Record<'active' | 'inactive' | 'deleted', string> = {
  active: 'Active',
  inactive: 'Inactive',
  deleted: 'Deleted',
};

export function StatusBadge({
  status,
  label,
}: {
  status: 'active' | 'inactive' | 'deleted';
  label?: string;
}) {
  return (
    <Badge tone={STATUS_TONE[status]} variant="soft">
      {label ?? STATUS_LABEL[status]}
    </Badge>
  );
}

export { DateCell, DateTimeCell } from './date-cells';

// ---------------------------------------------------------------------------
// Toolbar components
// ---------------------------------------------------------------------------

/** Search input for the DataTable toolbar. Pair with the `toolbar` prop. */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <SearchIcon
        className="text-text-disabled pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-input border-border-strong bg-surface text-body text-text-primary placeholder:text-text-disabled focus:border-primary-500 focus:ring-primary-500 w-full border py-1.5 pr-3 pl-9 focus:ring-1 focus:outline-none"
      />
    </div>
  );
}

/** Select-all checkbox for the toolbar. Shows count when items are selected. */
export function SelectAllCheckbox({
  count,
  total,
  onToggle,
}: {
  count: number;
  total: number;
  onToggle: () => void;
}) {
  return (
    <label className="text-body text-text-secondary flex cursor-pointer items-center gap-2 select-none">
      <input
        type="checkbox"
        checked={total > 0 && count === total}
        ref={(el) => {
          if (el) el.indeterminate = count > 0 && count < total;
        }}
        onChange={onToggle}
        className="border-border-strong text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer rounded"
      />
      {count > 0 ? `${count} selected` : 'Select all'}
    </label>
  );
}

/** Pill-style filter buttons for the toolbar. */
export function FilterPills<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: V }[];
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-pill px-3 py-1 text-[11px] font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary-100 text-primary-700 ring-primary-600/20 ring-1 ring-inset'
              : 'bg-surface-sunken text-text-muted hover:bg-surface-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Toggle switch for boolean filters (e.g. "Active only"). */
export function ToggleFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`rounded-pill focus-visible:ring-primary-500 relative inline-flex h-5 w-9 shrink-0 items-center transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
          checked ? 'bg-primary-600' : 'bg-border-strong'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
      <span className="text-body text-text-secondary">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Column factories
// ---------------------------------------------------------------------------

const CHECKBOX_CLASS =
  'h-4 w-4 cursor-pointer rounded border-border-strong text-primary-600 focus:ring-primary-500';

export function checkboxColumn<T>({
  selected,
  onToggle,
  rowId,
  isSelectable,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  rowId: (row: T) => string;
  isSelectable?: (row: T) => boolean;
}): DataTableColumn<T> {
  return {
    header: '',
    headerClassName: 'w-10 px-3 py-3',
    cell: (row) => {
      if (isSelectable && !isSelectable(row)) return null;
      const id = rowId(row);
      return (
        <input
          type="checkbox"
          checked={selected.has(id)}
          onChange={() => onToggle(id)}
          className={CHECKBOX_CLASS}
        />
      );
    },
    cellClassName: 'w-10 px-3 py-3',
  };
}

// ---------------------------------------------------------------------------
// Actions column
// ---------------------------------------------------------------------------

const ACTION_ICONS: Record<'clone' | 'delete' | 'edit', ReactNode> = {
  clone: <CopyIcon className="h-4 w-4" />,
  delete: <TrashIcon className="h-4 w-4" />,
  edit: <EditIcon className="h-4 w-4" />,
};

export type RowAction<T> =
  | {
      icon: 'clone' | 'delete' | 'edit';
      label: string;
      onClick: (row: T) => void;
      variant?: 'default' | 'danger';
      loading?: (row: T) => boolean;
      hidden?: (row: T) => boolean;
    }
  | {
      /** Escape hatch for custom action components. */
      render: (row: T) => ReactNode;
    };

/**
 * Creates a right-aligned actions column from a list of action descriptors.
 *
 * Each action is either:
 * - `{ icon, label, onClick }` — renders as a standard `<IconButton>`
 * - `{ render }` — renders a custom component (escape hatch)
 */
export function actionsColumn<T>(actions: RowAction<T>[]): DataTableColumn<T> {
  return {
    header: <span className="sr-only">Actions</span>,
    headerClassName: 'relative px-6 py-3',
    cell: (row) => (
      <div className="flex justify-end gap-1">
        {actions.map((action, i) => {
          if ('render' in action) {
            return <Fragment key={i}>{action.render(row)}</Fragment>;
          }
          if (action.hidden?.(row)) return null;
          const isLoading = action.loading?.(row) ?? false;
          return (
            <IconButton
              key={i}
              label={action.label}
              icon={ACTION_ICONS[action.icon]}
              variant={action.variant === 'danger' ? 'danger' : 'default'}
              loading={isLoading}
              onClick={() => action.onClick(row)}
            />
          );
        })}
      </div>
    ),
    cellClassName: 'whitespace-nowrap px-6 py-4 text-right',
  };
}
