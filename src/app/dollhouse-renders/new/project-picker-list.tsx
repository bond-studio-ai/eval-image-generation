"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { DataTable, DateCell, FilterPills, type DataTableColumn } from "@/components/data-table";
import { actionsColumn } from "@/components/data-table-utils";
import { Pagination } from "@/components/pagination";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { FilterSearch } from "@/components/ui/filter-bar";
import { CheckIcon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { localUrl } from "@/lib/api-base";
import type { ProjectSummary } from "@/lib/projects";

const STATUS_FILTERS = ["all", "Scanned", "DesignsReady", "NeedsUserReview", "Errored"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Designs Ready", value: "DesignsReady" },
  { label: "Scanned", value: "Scanned" },
  { label: "Needs Review", value: "NeedsUserReview" },
  { label: "Errored", value: "Errored" }
];

const STATUS_FILTER_SET = new Set<string>(STATUS_FILTERS);

function readStatusFilter(value: string | undefined): StatusFilter {
  return value && STATUS_FILTER_SET.has(value) ? (value as StatusFilter) : "all";
}

type ViewMode = "grid" | "table";

const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Grid" },
  { value: "table" as const, label: "Table" }
];

interface ProjectPickerListProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectPickerList({ selectedProjectId, onSelect }: ProjectPickerListProps) {
  const { items, loading, total, totalPages, page, filters, setFilters, goToPage, paginating } = useInfiniteList<ProjectSummary>("projects", {
    limit: 12,
    urlFor: localUrl
  });

  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Upstream projects API has no free-text search, so this filter is purely
  // client-side over the current page. State is local, not URL-persisted — the
  // hook's `search` slot is intentionally unused to avoid debounced refetches
  // against a `?search=` param the BFF doesn't forward.
  const [clientFilter, setClientFilter] = useState("");

  const statusFilter = readStatusFilter(filters["status"]);
  const setStatus = useCallback(
    (next: StatusFilter) => {
      const merged = { ...filters };
      if (next === "all") {
        delete merged["status"];
      } else {
        merged["status"] = next;
      }
      setFilters(merged);
    },
    [filters, setFilters]
  );

  const filteredItems = useMemo(() => {
    const query = clientFilter.trim().toLowerCase();
    if (!query) return items;
    return items.filter((project) => {
      const haystack = `${project.id} ${project.name} ${project.address ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [clientFilter, items]);

  const isEmptyAfterLoad = !loading && filteredItems.length === 0;
  const emptyMessage = clientFilter || statusFilter !== "all" ? "No projects on this page match your filter." : "No projects found.";

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSearch value={clientFilter} onChange={setClientFilter} placeholder="Filter visible projects by id or name..." width="w-72" />
      <FilterPills<StatusFilter> options={STATUS_OPTIONS} value={statusFilter} onChange={setStatus} />
      <div className="ml-auto">
        <SegmentedControl<ViewMode> options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} size="sm" label="View mode" />
      </div>
    </div>
  );

  const pagination = <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} loading={paginating} />;

  if (viewMode === "table") {
    return <TableView items={filteredItems} loading={loading} emptyMessage={emptyMessage} toolbar={toolbar} footer={pagination} selectedProjectId={selectedProjectId} onSelect={onSelect} />;
  }

  return (
    <div className="border-border rounded-card bg-surface shadow-card border">
      <div className="border-border-subtle border-b px-4 py-3">{toolbar}</div>
      {loading ? (
        <div className="flex items-center justify-center gap-3 px-6 py-12">
          <Spinner size="sm" />
          <span className="text-body text-text-secondary">Loading projects…</span>
        </div>
      ) : isEmptyAfterLoad ? (
        <p className="text-body text-text-muted px-6 py-12 text-center">{emptyMessage}</p>
      ) : (
        <ProjectGridRadioGroup projects={filteredItems} selectedProjectId={selectedProjectId} onSelect={onSelect} />
      )}
      <div className="border-border-subtle border-t px-4 py-3">{pagination}</div>
    </div>
  );
}

/**
 * ARIA radio-group with the focus management the APG pattern actually
 * requires: exactly one card holds `tabIndex=0` (the selected one, or
 * the first if nothing is selected yet), and arrow/Home/End move both
 * selection and focus. Activation on Space/Enter is just the default
 * button behavior.
 */
function ProjectGridRadioGroup({ projects, selectedProjectId, onSelect }: { projects: ProjectSummary[]; selectedProjectId: string | null; onSelect: (id: string) => void }) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Pin refs to the current length so a row shrinking doesn't keep stale
  // entries we'd then try to `.focus()` on a removed DOM node. Done in
  // an effect (not during render) so the mutation runs after React has
  // already unmounted the now-extra children — the ref callbacks above
  // will then write fresh entries on the next render.
  useEffect(() => {
    if (buttonsRef.current.length > projects.length) {
      buttonsRef.current.length = projects.length;
    }
  }, [projects.length]);

  const selectedIndex = projects.findIndex((p) => p.id === selectedProjectId);
  const tabStopIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const moveTo = useCallback(
    (nextIndex: number) => {
      const project = projects[nextIndex];
      if (!project) return;
      onSelect(project.id);
      buttonsRef.current[nextIndex]?.focus();
    },
    [projects, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (projects.length === 0) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          e.preventDefault();
          moveTo((currentIndex + 1) % projects.length);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          e.preventDefault();
          moveTo((currentIndex - 1 + projects.length) % projects.length);
          break;
        }
        case "Home": {
          e.preventDefault();
          moveTo(0);
          break;
        }
        case "End": {
          e.preventDefault();
          moveTo(projects.length - 1);
          break;
        }
        default:
          break;
      }
    },
    [projects.length, moveTo]
  );

  return (
    <div role="radiogroup" aria-label="Project list" className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectGridCard
          key={project.id}
          ref={(el) => {
            buttonsRef.current[index] = el;
          }}
          project={project}
          selected={selectedProjectId === project.id}
          tabIndex={index === tabStopIndex ? 0 : -1}
          onSelect={onSelect}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </div>
  );
}

function TableView({
  items,
  loading,
  emptyMessage,
  toolbar,
  footer,
  selectedProjectId,
  onSelect
}: {
  items: ProjectSummary[];
  loading: boolean;
  emptyMessage: string;
  toolbar: ReactNode;
  footer: ReactNode;
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}) {
  const columns = useMemo<DataTableColumn<ProjectSummary>[]>(
    () => [
      {
        header: "Project",
        cell: (row) => (
          <div>
            <Button variant="link" onClick={() => onSelect(row.id)}>
              {row.id}
            </Button>
            {row.name && <p className="text-caption text-text-muted mt-0.5 max-w-xs truncate">{row.name}</p>}
          </div>
        ),
        cellClassName: "px-6 py-4"
      },
      {
        header: "Status",
        cell: (row) =>
          row.appStatus ? (
            <Badge tone={statusTone(row.appStatus)} variant="soft" size="sm">
              {row.appStatus}
            </Badge>
          ) : (
            <span className="text-text-muted">{"—"}</span>
          )
      },
      {
        header: "Created",
        cell: (row) => (row.created ? <DateCell date={row.created} /> : <span className="text-text-muted">{"—"}</span>)
      },
      actionsColumn<ProjectSummary>([
        {
          render: (row) => {
            const isSelected = selectedProjectId === row.id;
            return (
              <Button type="button" size="sm" variant={isSelected ? "primary" : "secondary"} onClick={() => onSelect(row.id)} iconLeft={isSelected ? <CheckIcon className="size-3.5" /> : undefined}>
                {isSelected ? "Selected" : "Select"}
              </Button>
            );
          }
        }
      ])
    ],
    [onSelect, selectedProjectId]
  );

  return (
    <DataTable
      columns={columns}
      data={items}
      rowKey={(row) => row.id}
      className="mt-0"
      rowClassName={(row) => (selectedProjectId === row.id ? "bg-primary-50 hover:bg-primary-50" : "hover:bg-surface-muted")}
      emptyMessage={emptyMessage}
      loading={loading}
      toolbar={toolbar}
      footer={footer}
    />
  );
}

interface ProjectGridCardProps {
  project: ProjectSummary;
  selected: boolean;
  tabIndex: number;
  onSelect: (id: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  ref?: (el: HTMLButtonElement | null) => void;
}

function ProjectGridCard({ project, selected, tabIndex, onSelect, onKeyDown, ref }: ProjectGridCardProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={() => onSelect(project.id)}
      onKeyDown={onKeyDown}
      className={cn(
        "group rounded-card bg-surface shadow-card relative flex flex-col gap-2 border p-4 text-left transition-all",
        "focus-visible:outline-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        selected ? "border-primary-600 ring-primary-500 bg-primary-50 ring-2" : "border-border hover:border-border-strong hover:shadow-card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("text-body font-mono font-semibold", selected ? "text-primary-800" : "text-text-primary")}>{project.id}</span>
        {selected && (
          <Badge tone="info" variant="solid" size="sm" iconLeft={<CheckIcon className="size-3" />}>
            Selected
          </Badge>
        )}
      </div>
      {project.name && <p className="text-body text-text-secondary line-clamp-2">{project.name}</p>}
      {project.address && <p className="text-caption text-text-muted line-clamp-1">{project.address}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        {project.appStatus ? (
          <Badge tone={statusTone(project.appStatus)} variant="soft" size="sm">
            {project.appStatus}
          </Badge>
        ) : (
          <span className="text-caption text-text-muted">{"—"}</span>
        )}
        {project.created && (
          <span className="text-caption text-text-muted">
            <DateCell date={project.created} />
          </span>
        )}
      </div>
    </button>
  );
}

function statusTone(status: string): BadgeTone {
  if (status === "DesignsReady") return "success";
  if (status === "Scanned") return "info";
  if (status === "NeedsUserReview") return "warning";
  if (status === "Errored") return "danger";
  return "neutral";
}
