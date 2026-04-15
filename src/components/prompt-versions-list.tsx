'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  DataTable,
  DateCell,
  NameCell,
  SearchBar,
  SelectAllCheckbox,
  StatusBadge,
  actionsColumn,
  checkboxColumn,
  type DataTableColumn,
} from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

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

  const {
    items,
    loading,
    total,
    totalPages,
    page,
    search,
    setSearch,
    goToPage,
    refresh,
  } = useInfiniteList<PromptVersionRow>('prompt-versions', { limit: 20 });

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
    const ids = [...selected];
    const res = await fetch(serviceUrl('prompt-versions/bulk-delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelected(new Set());
      refresh();
    }
  }, [selected, refresh]);

  const handleClone = useCallback(async (pv: PromptVersionRow) => {
    setCloningId(pv.id);
    try {
      const res = await fetch(serviceUrl('prompt-versions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Copy of ${pv.name || 'Untitled'}`,
          description: pv.description || undefined,
          system_prompt: pv.systemPrompt,
          user_prompt: pv.userPrompt,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) router.push(`/prompt-versions/${newId}`);
    } catch { /* ignore */ }
    finally { setCloningId(null); }
  }, [router]);

  const columns = useMemo<DataTableColumn<PromptVersionRow>[]>(() => [
    checkboxColumn<PromptVersionRow>({
      selected,
      onToggle: toggleSelect,
      rowId: (pv) => pv.id,
      isSelectable: (pv) => !pv.deletedAt,
    }),
    {
      header: 'Name',
      cell: (pv) => <NameCell href={`/prompt-versions/${pv.id}`} name={pv.name} subtitle={pv.userPrompt} />,
      cellClassName: 'px-6 py-4',
    },
    {
      header: 'Generations',
      cell: (pv) => pv.stats?.generationCount ?? 0,
    },
    {
      header: 'Created',
      cell: (pv) => <DateCell date={pv.createdAt} />,
    },
    {
      header: 'Status',
      cell: (pv) => <StatusBadge status={pv.deletedAt ? 'deleted' : 'active'} />,
    },
    actionsColumn<PromptVersionRow>([
      { icon: 'clone', label: 'Clone prompt version', onClick: (pv) => handleClone(pv), loading: (pv) => cloningId === pv.id },
    ]),
  ], [selected, toggleSelect, handleClone, cloningId]);

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
        rowClassName={(pv) => `hover:bg-gray-50 ${selected.has(pv.id) ? 'bg-primary-50/50' : ''}`}
        emptyMessage={search ? 'No prompt versions match your search.' : 'No prompt versions found.'}
        loading={loading}
        toolbar={toolbar}
        footer={<Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />}
      />

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="prompt versions"
      />
    </>
  );
}
