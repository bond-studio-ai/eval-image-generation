import Link from 'next/link';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

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
  'px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600';

export const TD_DEFAULT =
  'whitespace-nowrap px-6 py-4 text-sm text-gray-700';

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
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6', 'w-2/5'];

function SkeletonRow({ colCount, rowIndex }: { colCount: number; rowIndex: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }, (_, i) => (
        <td key={i} className="px-6 py-4">
          <div
            className={`h-4 animate-pulse rounded bg-gray-200 ${SKELETON_WIDTHS[(rowIndex + i) % SKELETON_WIDTHS.length]}`}
          />
        </td>
      ))}
    </tr>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  rowClassName,
  emptyMessage = 'No items found.',
  loading = false,
  skeletonRows = 8,
  toolbar,
  footer,
  className = 'mt-8',
  onLoadMore,
  hasMore,
  loadingMore,
}: DataTableProps<T>) {
  const colCount = columns.length;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore]);

  return (
    <div
      className={`overflow-clip rounded-lg border border-gray-200 bg-white shadow-xs ${className}`}
    >
      {toolbar && (
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3">{toolbar}</div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={col.headerClassName ?? TH_DEFAULT}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              Array.from({ length: skeletonRows }, (_, i) => (
                <SkeletonRow key={i} colCount={colCount} rowIndex={i} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-6 py-6 text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={rowClassName?.(row) ?? 'hover:bg-gray-50'}
                >
                  {columns.map((col, i) => (
                    <td key={i} className={col.cellClassName ?? TD_DEFAULT}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {loadingMore && (
              <tr>
                <td colSpan={colCount} className="py-4">
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {hasMore && <div ref={sentinelRef} className="h-1" />}
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
      <Link
        href={href}
        className="text-sm font-medium text-primary-600 hover:text-primary-500"
      >
        {name || fallback}
      </Link>
      {subtitle && (
        <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: 'active' | 'inactive' | 'deleted';
  label?: string;
}) {
  const config = {
    active:   { classes: 'bg-green-50 text-green-700 ring-green-600/20', text: 'Active' },
    inactive: { classes: 'bg-gray-50 text-gray-600 ring-gray-300',       text: 'Inactive' },
    deleted:  { classes: 'bg-red-50 text-red-700 ring-red-600/20',       text: 'Deleted' },
  } as const;

  const { classes, text } = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}
    >
      {label ?? text}
    </span>
  );
}

export function DateCell({ date }: { date: string }) {
  return <>{new Date(date).toLocaleDateString()}</>;
}

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
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 select-none">
      <input
        type="checkbox"
        checked={total > 0 && count === total}
        ref={(el) => { if (el) el.indeterminate = count > 0 && count < total; }}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary-100 text-primary-700 ring-1 ring-inset ring-primary-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column factories
// ---------------------------------------------------------------------------

const CHECKBOX_CLASS =
  'h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500';

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

const ACTION_PATHS: Record<string, string> = {
  clone:  'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75',
  delete: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
  edit:   'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125',
};

const VARIANT_CLASSES = {
  default: 'rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50',
  danger:  'rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50',
};

function ActionIcon({ name }: { name: string }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={ACTION_PATHS[name]} />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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
      /** Escape hatch for custom action components (e.g. DeployToEnvironmentButton). */
      render: (row: T) => ReactNode;
    };

/**
 * Creates a right-aligned actions column from a list of action descriptors.
 *
 * Each action is either:
 * - `{ icon, label, onClick }` — renders as a standard icon button
 * - `{ render }` — renders a custom component (escape hatch)
 */
function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'default',
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  children: ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const showTip = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setTip({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={showTip}
        onMouseLeave={() => setTip(null)}
        className={VARIANT_CLASSES[variant]}
      >
        {children}
      </button>
      {tip && (
        <span
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: tip.x, top: tip.y - 4 }}
        >
          {label}
        </span>
      )}
    </>
  );
}

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
            <ActionButton
              key={i}
              label={action.label}
              onClick={() => action.onClick(row)}
              disabled={isLoading}
              variant={action.variant}
            >
              {isLoading ? <SpinnerIcon /> : <ActionIcon name={action.icon} />}
            </ActionButton>
          );
        })}
      </div>
    ),
    cellClassName: 'whitespace-nowrap px-6 py-4 text-right',
  };
}
