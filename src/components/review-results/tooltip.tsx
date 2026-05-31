"use client";

import type { ReactNode } from "react";
import { TooltipWrap } from "@/components/ui/tooltip";

type TooltipAlign = "center" | "start" | "end";

/**
 * Inline label tooltip: wraps its children in a focusable trigger so keyboard
 * and screen-reader users can reach the hint. Click targets that are already
 * their own interactive element should pass that element to `TooltipWrap`
 * directly (see `drift-sorting.tsx`) to avoid nested focusable controls.
 */
export function Tooltip({ children, hint, width, triggerClassName, align }: { children: ReactNode; hint: ReactNode; width?: number; triggerClassName?: string; align?: TooltipAlign }) {
  return (
    <TooltipWrap content={hint} align={align ?? "center"} {...(width === undefined ? {} : { width })}>
      <button type="button" className={`inline-flex cursor-help outline-none ${triggerClassName ?? ""}`}>
        {children}
      </button>
    </TooltipWrap>
  );
}
