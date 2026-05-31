"use client";

import { useTooltip } from "./tooltip";
import type { SortDir, SortKey } from "./drift-sorting-utils";

export const NOT_APPLICABLE_CELL = <span className="text-text-disabled">&mdash;</span>;

/**
 * Sort indicator next to a sortable header. Renders as a faint
 * pair-of-arrows glyph when the column is inactive (signalling that
 * sorting is available without screaming for attention), and as the
 * directional arrow once the column becomes the active sort key.
 */
function sortGlyph(active: boolean, dir: SortDir): string {
  if (!active) return "⇅";
  return dir === "asc" ? "▲" : "▼";
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span aria-hidden="true" className={`text-[9px] ${active ? "text-text-secondary" : "text-text-disabled"}`}>
      {sortGlyph(active, dir)}
    </span>
  );
}

/**
 * Sortable column header. The whole `<th>` content is a `<button>`
 * so it's the single focusable element (no nested `tabIndex` with
 * the tooltip). The hover tooltip is driven by `useTooltip`,
 * which attaches the same mouseenter/leave + focus/blur handlers
 * directly to the button instead of wrapping a nested span.
 */
export function SortableHeader({
  sortKey,
  label,
  hint,
  currentKey,
  currentDir,
  onSort,
  align = "right"
}: {
  sortKey: SortKey;
  label: string;
  hint: string;
  currentKey: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  const { ref, onMouseEnter, onMouseLeave, onFocus, onBlur, portal } = useTooltip(hint, {
    align: align === "right" ? "end" : "start"
  });

  return (
    <th scope="col" className={`px-3 py-1.5 ${align === "right" ? "text-right" : "text-left"} tabular-nums`}>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          onSort(sortKey);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`inline-flex w-full items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"} hover:text-text-secondary focus-visible:text-text-secondary cursor-pointer outline-none`}
      >
        <span className="decoration-text-disabled decoration-dotted underline-offset-2">{label}</span>
        <SortIndicator active={active} dir={currentDir} />
      </button>
      {portal}
    </th>
  );
}
