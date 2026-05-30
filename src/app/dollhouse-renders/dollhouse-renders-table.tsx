'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import {
  DataTable,
  DateCell,
  FilterPills,
  NameCell,
  SearchBar,
  type DataTableColumn,
} from '@/components/data-table';
import { actionsColumn } from '@/components/data-table-utils';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { Pagination } from '@/components/pagination';
import { RenderStatusBadge } from '@/components/render-status-badge';
import { useInfiniteList } from '@/hooks/use-infinite-list';
import { serviceV2Url } from '@/lib/api-base';
import type { DollhouseRender } from '@/lib/dollhouse-renders';

const STATUS_FILTERS = ['all', 'pending', 'posted', 'completed', 'failed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Posted', value: 'posted' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

const STATUS_FILTER_SET = new Set<string>(STATUS_FILTERS);

function readStatusFilter(value: string | undefined): StatusFilter {
  return value && STATUS_FILTER_SET.has(value) ? (value as StatusFilter) : 'all';
}

function FramesPreview({ frames }: { frames: DollhouseRender['frames'] }) {
  if (!frames || frames.length === 0) {
    return <span className="text-text-muted">{'—'}</span>;
  }
  const visible = frames.slice(0, 3);
  const remaining = frames.length - visible.length;
  return (
    <div className="flex items-center gap-1">
      {visible.map((frame) => (
        <div
          key={frame.id}
          className="bg-surface-sunken ring-border h-10 w-14 overflow-hidden rounded-md ring-1 ring-inset"
          title={frame.summary}
        >
          <ImageWithSkeleton
            src={frame.prettyUrl || frame.imageUrl}
            alt={frame.summary || 'Frame'}
            sizes="56px"
            wrapperClassName="h-10 w-14"
          />
        </div>
      ))}
      {remaining > 0 && <span className="text-caption text-text-muted ml-1">+{remaining}</span>}
    </div>
  );
}

export function DollhouseRendersTable() {
  const router = useRouter();

  const {
    items,
    loading,
    total,
    totalPages,
    page,
    search,
    setSearch,
    filters,
    setFilters,
    goToPage,
    paginating,
  } = useInfiniteList<DollhouseRender>('dollhouse-renders', {
    limit: 20,
    urlFor: serviceV2Url,
    // `include[]=frames` is a response-shape modifier, not a user filter, so
    // it lives in staticParams — keeps the URL bar honest and removes the
    // mount-time `setFilters` round-trip that used to seed it.
    staticParams: { 'include[]': 'frames' },
  });

  const statusFilter: StatusFilter = readStatusFilter(filters.status);

  const setStatus = useCallback(
    (next: StatusFilter) => {
      const merged: Record<string, string> = { ...filters };
      if (next === 'all') {
        delete merged.status;
      } else {
        merged.status = next;
      }
      setFilters(merged);
    },
    [filters, setFilters],
  );

  const handleSearch = useCallback(
    (next: string) => {
      setSearch(next);
      const merged: Record<string, string> = { ...filters };
      const trimmed = next.trim();
      if (trimmed) {
        merged.projectId = trimmed;
      } else {
        delete merged.projectId;
      }
      setFilters(merged);
    },
    [filters, setFilters, setSearch],
  );

  const columns = useMemo<DataTableColumn<DollhouseRender>[]>(
    () => [
      {
        header: 'Project',
        cell: (row) => <NameCell href={`/dollhouse-renders/${row.id}`} name={row.projectId} />,
        cellClassName: 'px-6 py-4',
      },
      {
        header: 'Status',
        cell: (row) => <RenderStatusBadge status={row.status} />,
      },
      {
        header: 'Frames',
        cell: (row) => <FramesPreview frames={row.frames} />,
        cellClassName: 'px-6 py-2',
      },
      {
        header: 'Image',
        cell: (row) => (
          <span className="text-text-secondary">
            {row.imageConfig.width}×{row.imageConfig.height} {row.imageConfig.format}
          </span>
        ),
      },
      {
        header: 'Created',
        cell: (row) => <DateCell date={row.createdAt} />,
      },
      {
        header: 'Completed',
        cell: (row) =>
          row.completedAt ? (
            <DateCell date={row.completedAt} />
          ) : (
            <span className="text-text-muted">{'—'}</span>
          ),
      },
      actionsColumn<DollhouseRender>([
        {
          icon: 'edit',
          label: 'View render',
          onClick: (row) => router.push(`/dollhouse-renders/${row.id}`),
        },
      ]),
    ],
    [router],
  );

  const toolbar = (
    <div className="flex items-center gap-4">
      <div className="w-80">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Filter by project ID (e.g. PRJ-...)..."
        />
      </div>
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
      data={items}
      rowKey={(row) => row.id}
      emptyMessage={
        search || statusFilter !== 'all'
          ? 'No renders match your filters.'
          : 'No dollhouse renders yet. Create one to get started.'
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
