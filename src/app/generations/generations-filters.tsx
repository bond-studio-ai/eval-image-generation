"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type KeyboardEvent, Suspense, useCallback, useRef } from "react";
import { XIcon } from "@/components/ui/icons";
import type { PromptVersionListItem } from "@/lib/types";
import { buildGenerationsQuery, type FilterParams } from "./query-utils";

interface GenerationsFiltersProps {
  params: FilterParams;
  promptVersions: PromptVersionListItem[];
}

function GenerationsFiltersInner({ params, promptVersions }: GenerationsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const link = useCallback(
    (overrides: Partial<Record<keyof FilterParams, string | undefined>>) => {
      const merged: FilterParams = { ...params };
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) delete merged[key as keyof FilterParams];
        else merged[key as keyof FilterParams] = value;
      }
      return buildGenerationsQuery(merged);
    },
    [params]
  );

  const handleDateApply = useCallback(
    (from: string, to: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", "generations");
      if (from) next.set("from", from);
      else next.delete("from");
      if (to) next.set("to", to);
      else next.delete("to");
      router.push(`/executions?${next}`);
    },
    [router, searchParams]
  );

  const hasAny = params.scene_accuracy_rating || params.product_accuracy_rating || params.unrated || params.prompt_version_id || params.from || params.to || params.source === "benchmark";

  return (
    <div className="border-border bg-surface mt-4 rounded-lg border p-4 shadow-xs">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        {/* Rating filters */}
        <FilterGroup label="Scene">
          {["GOOD", "FAILED"].map((rating) => (
            <FilterChip
              key={`scene-${rating}`}
              href={link({
                scene_accuracy_rating: params.scene_accuracy_rating === rating ? undefined : rating,
                unrated: undefined
              })}
              active={params.scene_accuracy_rating === rating}
              variant={rating === "GOOD" ? "green" : "red"}
            >
              {rating === "GOOD" ? "Good" : "Failed"}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Product">
          {["GOOD", "FAILED"].map((rating) => (
            <FilterChip
              key={`product-${rating}`}
              href={link({
                product_accuracy_rating: params.product_accuracy_rating === rating ? undefined : rating,
                unrated: undefined
              })}
              active={params.product_accuracy_rating === rating}
              variant={rating === "GOOD" ? "green" : "red"}
            >
              {rating === "GOOD" ? "Good" : "Failed"}
            </FilterChip>
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          <FilterChip
            href={link({
              unrated: params.unrated === "true" ? undefined : "true",
              scene_accuracy_rating: undefined,
              product_accuracy_rating: undefined
            })}
            active={params.unrated === "true"}
            variant="amber"
          >
            Unrated only
          </FilterChip>
        </FilterGroup>

        {/* Prompt filter */}
        <FilterGroup label="Prompt">
          <select
            value={params.prompt_version_id ?? ""}
            onChange={(e) => {
              const id = e.target.value || undefined;
              router.push(link({ prompt_version_id: id }));
            }}
            className="focus:border-primary-500 focus:ring-primary-500 border-border-strong bg-surface text-text-secondary text-caption rounded-md border px-2.5 py-1.5 focus:ring-1 focus:outline-none"
          >
            <option value="">All prompts</option>
            {promptVersions.map((pv) => (
              <option key={pv.id} value={pv.id}>
                {pv.name ?? "Untitled"}
              </option>
            ))}
          </select>
        </FilterGroup>

        {/* Date range */}
        <FilterGroup label="Date range">
          <DateRangeForm from={params.from} to={params.to} onApply={handleDateApply} />
        </FilterGroup>

        {/* Sort */}
        <FilterGroup label="Sort">
          <FilterChip href={link({ order: "desc" })} active={params.order !== "asc"} variant="neutral">
            Newest
          </FilterChip>
          <FilterChip href={link({ order: "asc" })} active={params.order === "asc"} variant="neutral">
            Oldest
          </FilterChip>
        </FilterGroup>
      </div>

      {hasAny && (
        <div className="border-border-subtle mt-3 border-t pt-3">
          <Link href={buildGenerationsQuery(params.source === undefined ? {} : { source: params.source })} className="text-danger-600 hover:text-danger-700 text-caption inline-flex items-center gap-1 font-medium">
            <XIcon className="size-3.5" />
            Clear all filters
          </Link>
        </div>
      )}
    </div>
  );
}

export function GenerationsFilters(props: GenerationsFiltersProps) {
  return (
    <Suspense fallback={null}>
      <GenerationsFiltersInner {...props} />
    </Suspense>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-muted text-caption font-medium">{label}:</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

const chipVariants = {
  green: {
    active: "bg-success-100 text-success-800 ring-1 ring-success-300",
    inactive: "bg-surface-sunken text-text-secondary hover:bg-border"
  },
  red: {
    active: "bg-danger-100 text-danger-800 ring-1 ring-danger-300",
    inactive: "bg-surface-sunken text-text-secondary hover:bg-border"
  },
  amber: {
    active: "bg-warning-100 text-warning-800 ring-1 ring-warning-300",
    inactive: "bg-surface-sunken text-text-secondary hover:bg-border"
  },
  neutral: {
    active: "bg-primary-100 text-primary-700 ring-1 ring-primary-300",
    inactive: "bg-surface-sunken text-text-secondary hover:bg-border"
  }
};

function FilterChip({ href, active, variant, children }: { href: string; active: boolean; variant: keyof typeof chipVariants; children: React.ReactNode }) {
  const styles = chipVariants[variant];
  return (
    <Link href={href} className={`text-caption rounded-md px-2.5 py-1 font-medium transition-colors ${active ? styles.active : styles.inactive}`}>
      {children}
    </Link>
  );
}

function DateRangeForm({ from, to, onApply }: { from?: string | undefined; to?: string | undefined; onApply: (from: string, to: string) => void }) {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const apply = () => {
    onApply(fromRef.current?.value ?? "", toRef.current?.value ?? "");
  };
  const applyOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") apply();
  };
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={fromRef}
        type="date"
        name="from"
        aria-label="From date"
        defaultValue={from}
        onKeyDown={applyOnEnter}
        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-text-secondary text-caption rounded-md border px-2 py-1 focus:ring-1 focus:outline-none"
      />
      <span className="text-text-disabled text-caption">–</span>
      <input
        ref={toRef}
        type="date"
        name="to"
        aria-label="To date"
        defaultValue={to}
        onKeyDown={applyOnEnter}
        className="focus:border-primary-500 focus:ring-primary-500 border-border-strong text-text-secondary text-caption rounded-md border px-2 py-1 focus:ring-1 focus:outline-none"
      />
      <button type="button" onClick={apply} className="bg-surface-sunken text-text-secondary hover:bg-border text-caption rounded-md px-2.5 py-1 font-medium">
        Apply
      </button>
    </div>
  );
}
