"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { ChevronRightIcon } from "@/components/ui/icons";

/**
 * Maps a route segment to the display label shown in breadcrumbs. Anything not
 * listed falls back to a Title-cased version of the segment.
 */
const SEGMENT_LABELS: Record<string, string> = {
  "": "Analytics",
  executions: "Runs",
  audit: "Audit",
  compare: "Compare",
  strategies: "Strategies",
  "input-presets": "Input Presets",
  "prompt-versions": "Prompt Versions",
  "prompt-preview": "Prompt Preview",
  generations: "Generations",
  runs: "Runs",
  edit: "Edit",
  new: "New"
};

interface Crumb {
  label: string;
  href?: string;
}

function isLikelyId(segment: string): boolean {
  return /^[0-9a-f-]{8,}$/i.test(segment);
}

function titleCase(segment: string): string {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Analytics" }];
  const out: Crumb[] = [];
  let path = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg === undefined) continue;
    path += `/${seg}`;
    const label = SEGMENT_LABELS[seg] ?? (isLikelyId(seg) ? seg.slice(0, 8) : titleCase(seg));
    const isLast = i === segments.length - 1;
    out.push(isLast ? { label } : { label, href: path });
  }
  return out;
}

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const pathname = usePathname();
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);
  const env = process.env.NEXT_PUBLIC_ENV_LABEL;

  return (
    <div className={cn("border-border bg-surface/80 sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm sm:px-6", className)}>
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="text-caption flex items-center gap-1 overflow-hidden">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              // eslint-disable-next-line react/no-array-index-key -- breadcrumbs are a positionally-stable trail, never reordered, labels can repeat
              <li key={`${crumb.label}-${i}`} className="flex shrink-0 items-center gap-1">
                {i > 0 && <ChevronRightIcon className="text-text-disabled size-3" aria-hidden="true" />}
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="text-text-muted hover:text-text-primary truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", isLast ? "text-text-primary font-medium" : "text-text-muted")} aria-current={isLast ? "page" : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {env && env !== "production" && <span className="rounded-pill bg-warning-50 text-warning-800 ring-warning-600/30 inline-flex items-center px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset">{env.toUpperCase()}</span>}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8"
            }
          }}
        />
      </div>
    </div>
  );
}
