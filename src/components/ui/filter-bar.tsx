import { Search } from 'lucide-react';
import { type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

interface FilterBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Left slot. Typically a `<FilterSearch>` and/or `<SegmentedControl>`. */
  start?: ReactNode;
  /** Right slot. Typically date pickers, sort, view-mode toggles. */
  end?: ReactNode;
}

/**
 * Generic toolbar that holds search + filter controls above a list view.
 * Replaces the bespoke filter rows on Generations, Executions, and Audit
 * Compare. Keep it wrapping (`flex-wrap`) so it survives narrow widths.
 */
export function FilterBar({ start, end, className, children, ...rest }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)} {...rest}>
      {start && <div className="flex flex-1 flex-wrap items-center gap-3">{start}</div>}
      {children}
      {end && <div className="flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  );
}

interface FilterSearchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Visual width of the input. Defaults to `w-72`. */
  width?: string;
}

/**
 * Search input designed for `<FilterBar>`. Uses the same icon-prefix layout
 * as `SearchBar` inside DataTable but borders match the `border-border-strong`
 * filter-bar density.
 */
export function FilterSearch({
  value,
  onChange,
  placeholder = 'Search...',
  width = 'w-72',
  className,
  ...rest
}: FilterSearchProps) {
  return (
    <div className={cn('relative', width)}>
      <Search
        className="text-text-disabled pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'rounded-input border-border-strong bg-surface text-body text-text-primary w-full border py-1.5 pr-3 pl-9',
          'placeholder:text-text-disabled focus:border-primary-500 focus:ring-primary-500 focus:ring-1 focus:outline-none',
          className,
        )}
        {...rest}
      />
    </div>
  );
}
