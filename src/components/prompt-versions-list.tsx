'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import { Pagination } from '@/components/pagination';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface PromptVersionRow {
  id: string;
  name: string | null;
  userPrompt: string;
  model: string | null;
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
    const res = await fetch('/api/v1/prompt-versions/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }, [selected, router]);

  const allSelected = activeItems.length > 0 && selected.size === activeItems.length;

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Generations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((pv) => (
              <tr key={pv.id} className={`hover:bg-gray-50 ${selected.has(pv.id) ? 'bg-primary-50/50' : ''}`}>
                <td className="w-10 px-3 py-3">
                  {!pv.deletedAt && (
                    <input
                      type="checkbox"
                      checked={selected.has(pv.id)}
                      onChange={() => toggleSelect(pv.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/prompt-versions/${pv.id}`}
                    className="hover:text-primary-600 text-sm font-medium text-gray-900"
                  >
                    {pv.name || 'Untitled'}
                  </Link>
                  <p className="mt-1 max-w-xs truncate text-xs text-gray-600">{pv.userPrompt}</p>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {pv.model || '-'}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {pv.generationCount}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {new Date(pv.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  {pv.deletedAt ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                      Deleted
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                      Active
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} total={total} />
      </div>

      <BulkDeleteBar
        selectedCount={selected.size}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelected(new Set())}
        entityName="prompt versions"
      />
    </>
  );
}
