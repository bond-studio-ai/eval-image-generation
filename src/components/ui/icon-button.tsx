'use client';

import { useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

export type IconButtonVariant = 'default' | 'danger' | 'subtle';
export type IconButtonSize = 'sm' | 'md';

const VARIANT: Record<IconButtonVariant, string> = {
  default:
    'text-text-disabled hover:bg-surface-sunken hover:text-text-secondary focus-visible:outline-primary-600',
  danger:
    'text-text-disabled hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-danger-600',
  subtle:
    'text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-primary-600',
};

const SIZE: Record<IconButtonSize, string> = {
  sm: 'p-1 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'p-1.5 [&_svg]:h-4 [&_svg]:w-4',
};

const BASE =
  'inline-flex items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Required accessible label; also used as tooltip. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Icon-only square button with a hover tooltip and required `label` for a11y.
 * Replaces the bespoke `ActionButton` inside `actionsColumn` and the various
 * inline icon buttons (delete batch, retry, clear, etc.) across the app.
 */
export function IconButton({
  label,
  icon,
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  onMouseEnter,
  onMouseLeave,
  ref,
  ...rest
}: IconButtonProps) {
  const localRef = useRef<HTMLButtonElement>(null);
  const setRef = (el: HTMLButtonElement | null) => {
    localRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const isDisabled = disabled || loading;

  return (
    <>
      <button
        ref={setRef}
        type={type}
        disabled={isDisabled}
        aria-label={label}
        className={cn(BASE, VARIANT[variant], SIZE[size], className)}
        onMouseEnter={(e) => {
          const rect = localRef.current?.getBoundingClientRect();
          if (rect) setTip({ x: rect.left + rect.width / 2, y: rect.top });
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setTip(null);
          onMouseLeave?.(e);
        }}
        {...rest}
      >
        {loading ? <Spinner size="xs" /> : icon}
      </button>
      {tip && (
        <span
          className="bg-text-primary text-caption text-text-inverse shadow-popover pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded px-2 py-1 whitespace-nowrap"
          style={{ left: tip.x, top: tip.y - 4 }}
        >
          {label}
        </span>
      )}
    </>
  );
}
