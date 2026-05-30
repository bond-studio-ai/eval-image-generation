import { cn } from "./cn";

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6"
} as const;

type SpinnerSize = keyof typeof SIZES;

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

/**
 * Single source of truth for the spinning loader. Replaces ~10 hand-rolled
 * `<svg className="h-4 w-4 animate-spin">` copies across the app.
 */
export function Spinner({ size = "sm", className, label = "Loading" }: SpinnerProps) {
  return (
    <svg className={cn("animate-spin", SIZES[size], className)} fill="none" viewBox="0 0 24 24" role="status" aria-label={label}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
