"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { type ColumnDef, DataTable, DateCell, NameCell, type RowAction, SearchBar, SelectAllCheckbox, StatusBadge, ToggleFilter } from "@/components/data-table";
import { actionsColumn, checkboxColumn } from "@/components/data-table-utils";
import { Pagination } from "@/components/pagination";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toaster";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { createdEntitySchema } from "@/lib/api/schemas";
import type { StrategyListItem } from "@/lib/types";

const ACTIVE_SOURCE_LABEL: Record<string, string> = {
  photo: "Photo",
  pdp: "PDP"
};

export function StrategiesTable() {
  const router = useRouter();
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeOnly, setActiveOnly] = useState(false);

  const { items, loading, total, totalPages, page, search, setSearch, goToPage, paginating, refresh, setFilters } = useInfiniteList<StrategyListItem>("strategies", { limit: 20 });

  const updateActiveOnly = useCallback(
    (on: boolean) => {
      setActiveOnly(on);
      setFilters(on ? { is_active: "true" } : {});
    },
    [setFilters]
  );

  const handleClone = useCallback(
    async (id: string) => {
      setCloningId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/clone`), { method: "POST" });
        if (!res.ok) {
          toast.error("Failed to clone strategy", {
            description: `Server responded with ${res.status}.`
          });
          return;
        }
        const json: unknown = await res.json();
        const newId = parseOrFallback(createdEntitySchema, json, { data: { id: "" } }, "strategy clone").data.id;
        if (newId) {
          toast.success("Strategy cloned");
          router.push(`/strategies/${newId}/edit`);
        }
      } catch (error) {
        toast.error("Failed to clone strategy", error instanceof Error ? { description: error.message } : {});
      } finally {
        setCloningId(null);
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      const ok = await confirm({
        title: `Delete strategy "${name}"?`,
        description: "This will soft-delete the strategy. You can restore it later if needed.",
        confirmLabel: "Delete strategy",
        tone: "danger"
      });
      if (!ok) return;
      setDeletingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}`), { method: "DELETE" });
        if (!res.ok) {
          toast.error("Failed to delete strategy", {
            description: `Server responded with ${res.status}.`
          });
          return;
        }
        toast.success(`Deleted strategy "${name}"`);
        refresh();
      } catch (error) {
        toast.error("Failed to delete strategy", error instanceof Error ? { description: error.message } : {});
      } finally {
        setDeletingId(null);
      }
    },
    [refresh, confirm]
  );

  const handleDeactivate = useCallback(
    async (id: string) => {
      setTogglingId(id);
      try {
        const res = await fetch(serviceUrl(`strategies/${id}/deactivate`), { method: "POST" });
        if (!res.ok) {
          toast.error("Failed to deactivate strategy", {
            description: `Server responded with ${res.status}.`
          });
          return;
        }
        toast.success("Strategy deactivated");
        refresh();
      } catch (error) {
        toast.error("Failed to deactivate strategy", error instanceof Error ? { description: error.message } : {});
      } finally {
        setTogglingId(null);
      }
    },
    [refresh]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((strategy) => strategy.id));
    });
  }, [items]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    const results = await Promise.allSettled(ids.map((id) => fetch(serviceUrl(`strategies/${id}`), { method: "DELETE" })));
    const failed = results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.ok)).length;
    if (failed === 0) {
      toast.success(`Deleted ${ids.length} strateg${ids.length === 1 ? "y" : "ies"}`);
    } else if (failed === ids.length) {
      toast.error("Failed to delete strategies");
    } else {
      toast.warning(`Deleted ${ids.length - failed} of ${ids.length}`, {
        description: `${failed} failed.`
      });
    }
    setSelected(new Set());
    refresh();
  }, [selected, refresh]);

  const actions = useMemo<RowAction<StrategyListItem>[]>(
    () => [
      {
        icon: "clone",
        label: "Clone strategy",
        onClick: (strategy) => {
          void handleClone(strategy.id);
        },
        loading: (strategy) => cloningId === strategy.id
      },
      {
        icon: "delete",
        label: "Delete strategy",
        onClick: (strategy) => {
          void handleDelete(strategy.id, strategy.name);
        },
        variant: "danger",
        loading: (strategy) => deletingId === strategy.id
      }
    ],
    [handleClone, handleDelete, cloningId, deletingId]
  );

  const columns = useMemo<ColumnDef<StrategyListItem>[]>(
    () => [
      checkboxColumn<StrategyListItem>({
        selected,
        onToggle: toggleSelect,
        rowId: (strategy) => strategy.id
      }),
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => <NameCell href={`/strategies/${row.original.id}`} name={row.original.name} subtitle={row.original.description} />,
        meta: { cellClassName: "px-6 py-4" }
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const strategy = row.original;
          if (!strategy.activeForSource) {
            return (
              <Link href={`/strategies/${strategy.id}`} title="Open strategy to activate it">
                <StatusBadge status="inactive" />
              </Link>
            );
          }
          const sourceLabel = ACTIVE_SOURCE_LABEL[strategy.activeForSource ?? ""] ?? "Dollhouse";
          return (
            <button type="button" onClick={() => handleDeactivate(strategy.id)} disabled={togglingId === strategy.id} className="disabled:opacity-50" title={`Deactivate (currently active for ${sourceLabel.toLowerCase()})`}>
              <StatusBadge status="active" label={`Active · ${sourceLabel}`} />
            </button>
          );
        }
      },
      {
        id: "steps",
        header: "Steps",
        cell: ({ row }) => `${row.original.stepCount} step${row.original.stepCount === 1 ? "" : "s"}`
      },
      {
        id: "runs",
        header: "Runs",
        cell: ({ row }) => `${row.original.runCount} run${row.original.runCount === 1 ? "" : "s"}`
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => <DateCell date={row.original.createdAt} />
      },
      actionsColumn(actions)
    ],
    [actions, handleDeactivate, togglingId, selected, toggleSelect]
  );

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <SearchBar value={search} onChange={setSearch} placeholder="Search strategies..." />
      </div>
      <ToggleFilter label="Active only" checked={activeOnly} onChange={updateActiveOnly} />
      <div className="ml-auto">
        <SelectAllCheckbox count={selected.size} total={items.length} onToggle={toggleAll} />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(strategy) => strategy.id}
        rowClassName={(strategy) => `hover:bg-surface-muted ${selected.has(strategy.id) ? "bg-primary-50/50" : ""}`}
        emptyMessage={search || activeOnly ? "No strategies match your filters." : "No strategies found."}
        loading={loading}
        toolbar={toolbar}
        footer={<Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} loading={paginating} />}
      />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => {
          setSelected(new Set());
        }}
        entityName="strategies"
      />
    </>
  );
}
