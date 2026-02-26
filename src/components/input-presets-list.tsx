'use client';

import { BulkDeleteBar } from '@/components/bulk-delete-bar';
import { Pagination } from '@/components/pagination';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface InputPresetRow {
  id: string;
  name: string | null;
  description: string | null;
  imageCount: number;
  generationCount: number;
  createdAt: string;
  deletedAt: string | null;
}

interface InputPresetsListProps {
  data: InputPresetRow[];
  page: number;
  totalPages: number;
  total: number;
}

export function InputPresetsList({ data, page, totalPages, total }: InputPresetsListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cloningId, setCloningId] = useState<string | null>(null);

  const handleClone = useCallback(async (id: string) => {
    setCloningId(id);
    try {
      const res = await fetch(`/api/v1/input-presets/${id}/clone`, { method: 'POST' });
      if (!res.ok) return;
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) router.push(`/input-presets/${newId}/edit`);
    } finally {
      setCloningId(null);
    }
  }, [router]);

  const activeItems = data.filter((ip) => !ip.deletedAt);

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
      return new Set(activeItems.map((ip) => ip.id));
    });
  }, [activeItems]);

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selected];
    const res = await fetch('/api/v1/input-presets/bulk-delete', {
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
                Images
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
              <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((ip) => (
              <tr key={ip.id} className={`hover:bg-gray-50 ${selected.has(ip.id) ? 'bg-primary-50/50' : ''}`}>
                <td className="w-10 px-3 py-3">
                  {!ip.deletedAt && (
                    <input
                      type="checkbox"
                      checked={selected.has(ip.id)}
                      onChange={() => toggleSelect(ip.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/input-presets/${ip.id}`}
                    className="hover:text-primary-600 text-sm font-medium text-gray-900"
                  >
                    {ip.name || 'Untitled'}
                  </Link>
                  {ip.description && (
                    <p className="mt-1 max-w-xs truncate text-xs text-gray-600">{ip.description}</p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {ip.imageCount} image{ip.imageCount !== 1 ? 's' : ''}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {ip.generationCount}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                  {new Date(ip.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  {ip.deletedAt ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                      Deleted
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                  {!ip.deletedAt && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleClone(ip.id); }}
                      disabled={cloningId === ip.id}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                      title="Clone preset"
                    >
                      {cloningId === ip.id ? (
                        <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      )}
                      Clone
                    </button>
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
        entityName="input presets"
      />
    </>
  );
}
