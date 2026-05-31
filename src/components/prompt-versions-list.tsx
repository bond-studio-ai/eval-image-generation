"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { type ColumnDef, DataTable, DateCell, NameCell, SearchBar, SelectAllCheckbox, StatusBadge } from "@/components/data-table";
import { actionsColumn, checkboxColumn } from "@/components/data-table-utils";
import { Pagination } from "@/components/pagination";
import { useInfiniteList } from "@/hooks/use-infinite-list";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { createdEntitySchema } from "@/lib/api/schemas";

export interface PromptVersionRow {
  id: string;
  name: string | null;
  description: string | null;
  systemPrompt: string;
  userPrompt: string;
  stats?: { generationCount: number };
  createdAt: string;
  deletedAt: string | null;
}

export function PromptVersionsList() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);

  const { items, loading, total, totalPages, page, search, setSearch, goToPage, paginating, refresh } = useInfiniteList<PromptVersionRow>("prompt-versions", { limit: 20 });

  const activeItems = useMemo(() => items.filter((pv) => !pv.deletedAt), [items]);

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
      if (prev.size === activeItems.length) return new Set();
      return new Set(activeItems.map((pv) => pv.id));
    });
  }, [activeItems]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    const res = await fetch(serviceUrl("prompt-versions/bulk-delete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    if (res.ok) {
      setSelected(new Set());
      refresh();
    }
  }, [selected, refresh]);

  const handleClone = useCallback(
    async (pv: PromptVersionRow) => {
      setCloningId(pv.id);
      try {
        const res = await fetch(serviceUrl("prompt-versions"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Copy of ${pv.name || "Untitled"}`,
            description: pv.description || undefined,
            system_prompt: pv.systemPrompt,
            user_prompt: pv.userPrompt
          })
        });
        if (!res.ok) return;
        const json: unknown = await res.json();
        const newId = parseOrFallback(createdEntitySchema, json, { data: { id: "" } }, "prompt version clone").data.id;
        if (newId) router.push(`/prompt-versions/${newId}`);
      } catch {
        /* ignore */
      } finally {
        setCloningId(null);
      }
    },
    [router]
  );

  const columns = useMemo<ColumnDef<PromptVersionRow>[]>(
    () => [
      checkboxColumn<PromptVersionRow>({
        selected,
        onToggle: toggleSelect,
        rowId: (pv) => pv.id,
        isSelectable: (pv) => !pv.deletedAt
      }),
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => <NameCell href={`/prompt-versions/${row.original.id}`} name={row.original.name} subtitle={row.original.userPrompt} />,
        meta: { cellClassName: "px-6 py-4" }
      },
      {
        id: "generations",
        header: "Generations",
        cell: ({ row }) => row.original.stats?.generationCount ?? 0
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => <DateCell date={row.original.createdAt} />
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.deletedAt ? "deleted" : "active"} />
      },
      actionsColumn<PromptVersionRow>([
        {
          icon: "clone",
          label: "Clone prompt version",
          onClick: (pv) => {
            void handleClone(pv);
          },
          loading: (pv) => cloningId === pv.id
        }
      ])
    ],
    [selected, toggleSelect, handleClone, cloningId]
  );

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-72">
        <SearchBar value={search} onChange={setSearch} placeholder="Search prompt versions..." />
      </div>
      <div className="ml-auto">
        <SelectAllCheckbox count={selected.size} total={activeItems.length} onToggle={toggleAll} />
      </div>
    </div>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={items}
        rowKey={(pv) => pv.id}
        rowClassName={(pv) => `hover:bg-surface-muted ${selected.has(pv.id) ? "bg-primary-50/50" : ""}`}
        emptyMessage={search ? "No prompt versions match your search." : "No prompt versions found."}
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
        entityName="prompt versions"
      />
    </>
  );
}
