'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface SearchableSelectOption {
  value: string;
  /** Human-readable label rendered in the panel. Defaults to `value`. */
  label?: ReactNode;
  /** Optional secondary line shown muted below the label. */
  description?: ReactNode;
  /** Optional grouping key — siblings with the same group render under
   *  the group's header in the panel. Pass undefined to skip grouping. */
  group?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (next: string) => void;
  /** Forwarded to the underlying input via aria-labelledby. */
  ariaLabel?: string;
  placeholder?: string;
  /** When true the user can submit a value that isn't in the list. */
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional empty-state hint when filter has no matches. */
  emptyMessage?: string;
  /** Form input name; included so the component can be dropped into a
   *  plain <form method="get"> without an extra hidden field. */
  name?: string;
  /** Forwarded to the input's `id` attribute. Useful when an outer
   *  <label htmlFor=…> wires up to this combobox. */
  id?: string;
}

/**
 * SearchableSelect is the app-wide combobox primitive used by the
 * catalog-prompts pages (filter row, proposal form, new-version form).
 * Native <datalist> was the previous shortcut but it offered no
 * keyboard navigation, no group headers, and styled inconsistently
 * across browsers. This component covers those gaps without pulling
 * in a headless-ui dependency.
 *
 * Behaviour summary:
 *   - Type to filter; matching is case-insensitive substring.
 *   - ArrowDown/ArrowUp cycles highlighted options.
 *   - Enter selects the highlight; Escape closes the panel.
 *   - When `allowCustom` is true, Enter on no match commits the typed
 *     value verbatim. Otherwise Enter is a no-op on no match.
 *   - Click outside closes the panel.
 *
 * Accessibility:
 *   - Uses role="combobox" / role="listbox" / role="option" with
 *     aria-activedescendant so screen readers track the highlight.
 *   - Highlighted option mirrors keyboard focus without moving real
 *     focus off the input, so typing remains uninterrupted.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  ariaLabel,
  placeholder,
  allowCustom = false,
  disabled = false,
  className = '',
  emptyMessage = 'No matches.',
  name,
  id,
}: SearchableSelectProps) {
  const reactId = useId();
  const inputId = id ?? `combobox-${reactId}`;
  const listboxId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState<number>(-1);

  // Keep the visible query in sync when the parent rewires `value`
  // (e.g. URL change, form reset). The local `query` is the source of
  // truth while the panel is open so the user's typing is never
  // clobbered mid-edit.
  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const label = typeof opt.label === 'string' ? opt.label : opt.value;
      return (
        opt.value.toLowerCase().includes(q) ||
        (typeof label === 'string' && label.toLowerCase().includes(q))
      );
    });
  }, [options, query]);

  // Reset/clamp the highlight whenever the filter result changes so
  // ArrowDown always lands on a real option.
  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) {
      setHighlight(-1);
      return;
    }
    setHighlight((h) => {
      if (h < 0) return 0;
      return Math.min(h, filtered.length - 1);
    });
  }, [filtered, open]);

  // Click-outside collapses the panel without committing.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
      // Snap back to the committed value so partial typing doesn't
      // linger and confuse a return visit.
      setQuery(value);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, value]);

  // Scroll highlighted row into view as the user keyboard-paginates.
  useEffect(() => {
    if (!open || highlight < 0) return;
    const node = optionRefs.current[highlight];
    if (node) node.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const commit = useCallback(
    (next: string) => {
      setQuery(next);
      onChange(next);
      setOpen(false);
    },
    [onChange],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => {
        if (filtered.length === 0) return -1;
        return (h + 1) % filtered.length;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => {
        if (filtered.length === 0) return -1;
        return (h - 1 + filtered.length) % filtered.length;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (highlight >= 0 && filtered[highlight] && !filtered[highlight].disabled) {
        event.preventDefault();
        commit(filtered[highlight].value);
        return;
      }
      if (allowCustom) {
        event.preventDefault();
        commit(query.trim());
      }
      return;
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setQuery(value);
      }
    }
  };

  const grouped = useMemo(() => {
    const groups: Array<{ group: string | undefined; options: SearchableSelectOption[] }> = [];
    let current: { group: string | undefined; options: SearchableSelectOption[] } | null = null;
    for (const opt of filtered) {
      if (!current || current.group !== opt.group) {
        current = { group: opt.group, options: [] };
        groups.push(current);
      }
      current.options.push(opt);
    }
    return groups;
  }, [filtered]);

  // Flat index used for aria-activedescendant and keyboard nav so
  // group headers don't have to be considered in the highlight cycle.
  let flatIndex = 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={
            highlight >= 0 ? `${inputId}-option-${highlight}` : undefined
          }
          aria-label={ariaLabel}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (allowCustom) {
              // Free-text mode: keep parent state live so the form
              // can submit even without a selection event.
              onChange(event.target.value);
            }
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-300 px-2 py-1.5 pr-8 text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
        />
        <button
          type="button"
          aria-label={open ? 'Close suggestions' : 'Open suggestions'}
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-600 disabled:opacity-40"
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">{emptyMessage}</li>
          )}
          {grouped.map((g, gi) => (
            <li key={gi} role="presentation">
              {g.group && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
                  {g.group}
                </div>
              )}
              <ul role="presentation">
                {g.options.map((opt) => {
                  const idx = flatIndex++;
                  const isHighlighted = idx === highlight;
                  const isSelected = opt.value === value;
                  return (
                    <li
                      key={opt.value}
                      ref={(el) => {
                        optionRefs.current[idx] = el;
                      }}
                      id={`${inputId}-option-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled || undefined}
                      onMouseEnter={() => setHighlight(idx)}
                      onMouseDown={(event) => {
                        // mousedown beats the input's blur and avoids
                        // a focus flicker when picking with the mouse.
                        event.preventDefault();
                        if (opt.disabled) return;
                        commit(opt.value);
                      }}
                      className={`flex cursor-pointer items-center justify-between px-3 py-1.5 ${
                        isHighlighted ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      } ${opt.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate font-mono text-xs">
                          {typeof opt.label === 'string' || typeof opt.label === 'number'
                            ? opt.label
                            : opt.label ?? opt.value}
                        </span>
                        {opt.description && (
                          <span className="block truncate text-[10px] text-gray-500">
                            {opt.description}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <svg
                          className="ml-2 h-3.5 w-3.5 shrink-0 text-primary-600"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 10l4 4 8-8"
                          />
                        </svg>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
