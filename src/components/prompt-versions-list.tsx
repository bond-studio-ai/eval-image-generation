'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import {
  DataTable,
  DateCell,
  NameCell,
  StatusBadge,
  actionsColumn,
  checkboxColumn,
  type DataTableColumn,
} from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

export interface PromptVersionRow {
  id: string;
  name: string | null;
  description: string | null;
  systemPrompt: string;
  userPrompt: string;
  generationCount: number;
  createdAt: string;
  deletedAt: string | null;
}

interface PromptVersionsListProps {
  data: PromptVersionRow[];
  page: number;
  totalPages: number;
  total: number;
}

export function PromptVersionsList({ data, page, totalPages, total }: PromptVersionsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);

  const activeItems = data.filter((pv) => !pv.deletedAt);

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
      router.refresh();
    }
  }, [selected, router]);

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

  const allSelected = activeItems.length > 0 && selected.size === activeItems.length;

  const columns = useMemo<DataTableColumn<PromptVersionRow>[]>(() => [
    checkboxColumn<PromptVersionRow>({
      selected,
      onToggle: toggleSelect,
      onToggleAll: toggleAll,
      allSelected,
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
      cell: (pv) => pv.generationCount,
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
  ], [allSelected, toggleAll, selected, toggleSelect, handleClone, cloningId]);

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        rowKey={(pv) => pv.id}
        rowClassName={(pv) => `hover:bg-gray-50 ${selected.has(pv.id) ? 'bg-primary-50/50' : ''}`}
        emptyMessage="No prompt versions found."
        footer={<Pagination page={page} totalPages={totalPages} total={total} />}
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
