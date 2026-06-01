"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "./cn";

const CONTENT_CLASS = "text-text-inverse bg-text-primary z-50 rounded px-2 py-1.5 text-[11px] leading-snug font-normal tracking-normal whitespace-normal normal-case shadow-lg";

/** App-wide tooltip provider. Mounted once near the root so all tooltips share a hover delay. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  );
}

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "center" | "start" | "end";

/**
 * Tooltip whose trigger is an existing focusable element. Pass a single
 * focusable child (e.g. a `<button>`); Radix wires it as the trigger via
 * `asChild` and handles positioning, collision flipping, and dismissal.
 */
export function TooltipWrap({
  content,
  children,
  side = "bottom",
  align = "center",
  width,
  contentClassName
}: {
  content: ReactNode;
  children: ReactNode;
  side?: TooltipSide;
  align?: TooltipAlign;
  width?: number;
  contentClassName?: string;
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content side={side} align={align} sideOffset={6} collisionPadding={8} className={cn(CONTENT_CLASS, contentClassName)} style={width === undefined ? undefined : { maxWidth: width }}>
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
