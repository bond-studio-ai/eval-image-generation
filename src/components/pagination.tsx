"use client";

import { useCallback, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

function pageRange(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];

  if (current > 3) pages.push("ellipsis-start");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis-end");

  pages.push(total);
  return pages;
}

function EllipsisJump({ totalPages, onPageChange, className }: { totalPages: number; onPageChange: (page: number) => void; className: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const focusOnMount = useCallback((node: HTMLInputElement | null) => node?.focus(), []);

  const submit = () => {
    const target = parseInt(value, 10);
    if (target >= 1 && target <= totalPages) onPageChange(target);
    setEditing(false);
    setValue("");
  };

  if (editing) {
    return (
      <input
        ref={focusOnMount}
        aria-label="Jump to page"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setEditing(false);
            setValue("");
          }
        }}
        onBlur={() => {
          setEditing(false);
          setValue("");
        }}
        className={`${className} text-text-primary text-caption w-12 text-center outline-none`}
        placeholder="#"
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} title="Jump to page" className={`${className} text-text-disabled hover:text-text-secondary`}>
      &hellip;
    </button>
  );
}

const BASE_BTN = "relative inline-flex items-center px-2 py-2 text-body font-medium ring-1 ring-border-strong ring-inset focus:z-10";

export function Pagination({ page, totalPages, total, onPageChange, loading }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageRange(page, totalPages);

  return (
    <div className="border-border flex items-center justify-between border-t px-4 py-3 sm:px-6">
      <p className="text-text-secondary text-body flex items-center gap-2">
        {loading && <Spinner className="text-text-disabled size-3.5" />}
        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
        <span className="text-text-disabled"> ({total} results)</span>
      </p>

      <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${BASE_BTN} text-text-secondary hover:bg-surface-muted rounded-l-md disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ChevronLeftIcon className="size-5" />
        </button>

        {pages.map((p) =>
          typeof p === "string" ? (
            <EllipsisJump key={p} totalPages={totalPages} onPageChange={onPageChange} className={`${BASE_BTN} min-w-[2.25rem] justify-center`} />
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              disabled={p === page}
              className={`${BASE_BTN} min-w-[2.25rem] justify-center ${p === page ? "bg-primary-50 text-primary-600 ring-primary-500 z-10" : "text-text-secondary hover:bg-surface-muted"}`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${BASE_BTN} text-text-secondary hover:bg-surface-muted rounded-r-md disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ChevronRightIcon className="size-5" />
        </button>
      </nav>
    </div>
  );
}
