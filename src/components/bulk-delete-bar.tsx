'use client';

import { useCallback, useState } from 'react';
import { TrashIcon } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/spinner';

interface BulkDeleteBarProps {
  selectedCount: number;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  entityName?: string;
}

export function BulkDeleteBar({
  selectedCount,
  onDelete,
  onClearSelection,
  entityName = 'items',
}: BulkDeleteBarProps) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }, [onDelete]);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-primary-100 text-primary-700 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear selection
          </button>
        </div>
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-red-600">
                Delete {selectedCount} {entityName}?
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-400"
              >
                {deleting ? (
                  <>
                    <Spinner className="size-4" />
                    Deleting…
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <TrashIcon className="size-4" />
              Delete Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
