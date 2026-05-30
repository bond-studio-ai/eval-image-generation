/**
 * Stateless date renderers. Kept in a hook-free module so server components
 * can import them without dragging in the client-only `DataTable` hooks.
 *
 * `DataTable` re-exports these for back-compat — most client callers reach
 * them via `@/components/data-table` alongside the rest of the table kit.
 */

export function DateCell({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-text-muted">{'—'}</span>;
  return <>{new Date(date).toLocaleDateString()}</>;
}

/** Same as `DateCell` but renders date + time. Null-safe. */
export function DateTimeCell({ date }: { date: string | null | undefined }) {
  if (!date) return <span className="text-text-muted">{'—'}</span>;
  return <>{new Date(date).toLocaleString()}</>;
}
