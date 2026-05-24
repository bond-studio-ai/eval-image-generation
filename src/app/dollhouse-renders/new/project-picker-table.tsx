'use client';

import {
  actionsColumn,
  DataTable,
  DateCell,
  FilterPills,
  type DataTableColumn,
} from '@/components/data-table';
import { Pagination } from '@/components/pagination';
import { Button, FilterSearch } from '@/components/ui';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { localUrl } from '@/lib/api-base';
import type { ProjectSummary } from '@/lib/projects';
import { useCallback, useMemo, useState } from 'react';

const STATUS_FILTERS = ['all', 'Scanned', 'DesignsReady', 'NeedsUserReview', 'Errored'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Designs Ready', value: 'DesignsReady' },
  { label: 'Scanned', value: 'Scanned' },
  { label: 'Needs Review', value: 'NeedsUserReview' },
  { label: 'Errored', value: 'Errored' },
];

const STATUS_FILTER_SET = new Set<string>(STATUS_FILTERS);

function readStatusFilter(value: string | undefined): StatusFilter {
  return value && STATUS_FILTER_SET.has(value) ? (value as StatusFilter) : 'all';
}

interface ProjectPickerTableProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectPickerTable({ selectedProjectId, onSelect }: ProjectPickerTableProps) {
  const { items, loading, total, totalPages, page, filters, setFilters, goToPage, paginating } =
    useInfiniteList<ProjectSummary>('projects', {
      limit: 10,
      urlFor: localUrl,
    });

  // Upstream projects API has no free-text search, so this filter is purely
  // client-side over the current page. State is local, not URL-persisted — the
  // hook's `search` slot is intentionally unused to avoid debounced refetches
  // against a `?search=` param the BFF doesn't forward.
  const [clientFilter, setClientFilter] = useState('');

  const statusFilter = readStatusFilter(filters.status);
  const setStatus = useCallback(
    (next: StatusFilter) => {
      const merged = { ...filters };
      if (next === 'all') {
        delete merged.status;
      } else {
        merged.status = next;
      }
      setFilters(merged);
    },
    [filters, setFilters],
  );

  const filteredItems = useMemo(() => {
    const query = clientFilter.trim().toLowerCase();
    if (!query) return items;
    return items.filter((project) => {
      const haystack = `${project.id} ${project.name} ${project.address ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [clientFilter, items]);

  const columns = useMemo<DataTableColumn<ProjectSummary>[]>(
    () => [
      {
        header: 'Project',
        cell: (row) => (
          // Selecting is an in-page action (not navigation), so this is a
          // `Button variant="link"` rather than `NameCell` (which renders a
          // `<Link href>`). The button keeps the brand link styling without
          // hand-rolling Tailwind classes here.
          <div>
            <Button variant="link" onClick={() => onSelect(row.id)}>
              {row.id}
            </Button>
            {row.name && (
              <p className="text-caption text-text-muted mt-0.5 max-w-xs truncate">{row.name}</p>
            )}
          </div>
        ),
        cellClassName: 'px-6 py-4',
      },
      {
        header: 'Status',
        cell: (row) => <span className="text-text-secondary">{row.appStatus || '—'}</span>,
      },
      {
        header: 'Created',
        cell: (row) =>
          row.created ? (
            <DateCell date={row.created} />
          ) : (
            <span className="text-text-muted">—</span>
          ),
      },
      actionsColumn<ProjectSummary>([
        {
          render: (row) => {
            const isSelected = selectedProjectId === row.id;
            return (
              <Button
                type="button"
                size="sm"
                variant={isSelected ? 'primary' : 'secondary'}
                onClick={() => onSelect(row.id)}
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            );
          },
        },
      ]),
    ],
    [onSelect, selectedProjectId],
  );

  const toolbar = (
    <div className="flex items-center gap-4">
      <FilterSearch
        value={clientFilter}
        onChange={setClientFilter}
        placeholder="Filter visible projects by id or name..."
        width="w-72"
      />
      <FilterPills<StatusFilter>
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={setStatus}
      />
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={filteredItems}
      rowKey={(row) => row.id}
      className="mt-4"
      emptyMessage={
        clientFilter || statusFilter !== 'all'
          ? 'No projects on this page match your filter.'
          : 'No projects found.'
      }
      loading={loading}
      toolbar={toolbar}
      footer={
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={goToPage}
          loading={paginating}
        />
      }
    />
  );
}
