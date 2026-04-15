'use client';

import { useEffect, useRef, useState } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function pageRange(current: number, total: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];

  if (current > 3) pages.push('ellipsis-start');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('ellipsis-end');

  pages.push(total);
  return pages;
}

function EllipsisJump({
  totalPages,
  onPageChange,
  className,
}: {
  totalPages: number;
  onPageChange: (page: number) => void;
  className: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const submit = () => {
    const target = parseInt(value, 10);
    if (target >= 1 && target <= totalPages) onPageChange(target);
    setEditing(false);
    setValue('');
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') { setEditing(false); setValue(''); }
        }}
        onBlur={() => { setEditing(false); setValue(''); }}
        className={`${className} w-12 text-center text-xs text-gray-900 outline-none`}
        placeholder="#"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Jump to page"
      className={`${className} text-gray-400 hover:text-gray-600`}
    >
      &hellip;
    </button>
  );
}

const BASE_BTN =
  'relative inline-flex items-center px-2 py-2 text-sm font-medium ring-1 ring-gray-300 ring-inset focus:z-10';

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageRange(page, totalPages);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
      <p className="text-sm text-gray-700">
        Page <span className="font-medium">{page}</span> of{' '}
        <span className="font-medium">{totalPages}</span>
        <span className="text-gray-400"> ({total} results)</span>
      </p>

      <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${BASE_BTN} rounded-l-md text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {pages.map((p) =>
          typeof p === 'string' ? (
            <EllipsisJump
              key={p}
              totalPages={totalPages}
              onPageChange={onPageChange}
              className={`${BASE_BTN} min-w-[2.25rem] justify-center`}
            />
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={p === page}
              className={`${BASE_BTN} min-w-[2.25rem] justify-center ${
                p === page
                  ? 'z-10 bg-primary-50 text-primary-600 ring-primary-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${BASE_BTN} rounded-r-md text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
}
