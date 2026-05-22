import { cn } from './cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

const SIZE = {
  sm: 'p-0.5 [&_button]:px-2.5 [&_button]:py-1 [&_button]:text-[11px]',
  md: 'p-1 [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-caption',
};

/**
 * Pill-style segmented control with an active "card" indicator.
 *
 * Use for binary or low-cardinality view-mode toggles (List/Matrix, source
 * filter, etc.). For navigation between tabs, prefer `<Tabs>` instead.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'rounded-button border-border bg-surface-sunken inline-flex border',
        SIZE[size],
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md font-medium transition-colors',
              'focus-visible:outline-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1',
              isActive
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary',
              opt.disabled && 'opacity-50',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
