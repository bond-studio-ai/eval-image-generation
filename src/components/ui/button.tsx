import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-xs hover:bg-primary-700 focus-visible:outline-primary-600 disabled:bg-primary-300 disabled:shadow-none',
  secondary:
    'bg-white text-text-primary ring-1 ring-inset ring-border-strong shadow-xs hover:bg-surface-muted focus-visible:outline-primary-600 disabled:text-text-disabled disabled:bg-surface-muted',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-primary-600 disabled:text-text-disabled disabled:bg-transparent',
  danger:
    'bg-danger-600 text-white shadow-xs hover:bg-danger-700 focus-visible:outline-danger-600 disabled:bg-danger-300 disabled:shadow-none',
  link: 'bg-transparent text-primary-600 hover:text-primary-700 focus-visible:outline-primary-600 disabled:text-text-disabled p-0 shadow-none',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-caption gap-1.5',
  md: 'px-4 py-2 text-body gap-2',
};

const BASE =
  'inline-flex items-center justify-center rounded-button font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

export interface ButtonProps
  extends ButtonOwnProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const linkSizing = variant === 'link' ? '' : SIZE[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(BASE, VARIANT[variant], linkSizing, fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 'xs' : 'sm'} />
      ) : iconLeft ? (
        <span className="-ml-0.5 flex shrink-0 items-center">{iconLeft}</span>
      ) : null}
      {children}
      {!loading && iconRight && (
        <span className="-mr-0.5 flex shrink-0 items-center">{iconRight}</span>
      )}
    </button>
  );
});

interface LinkButtonProps extends ButtonOwnProps {
  href: string;
  children?: ReactNode;
  className?: string;
  /** External or download links bypass next/link. */
  external?: boolean;
  target?: string;
  rel?: string;
}

/** Anchor variant of `Button` for navigation. */
export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  external = false,
  target,
  rel,
  className,
  children,
}: LinkButtonProps) {
  const linkSizing = variant === 'link' ? '' : SIZE[size];
  const classes = cn(BASE, VARIANT[variant], linkSizing, fullWidth && 'w-full', className);
  const inner = (
    <>
      {iconLeft && <span className="-ml-0.5 flex shrink-0 items-center">{iconLeft}</span>}
      {children}
      {iconRight && <span className="-mr-0.5 flex shrink-0 items-center">{iconRight}</span>}
    </>
  );
  if (external) {
    return (
      <a href={href} target={target} rel={rel} className={classes}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}
