"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icons";

interface BulkDeleteBarProps {
  selectedCount: number;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  entityName?: string;
}

export function BulkDeleteBar({ selectedCount, onDelete, onClearSelection, entityName = "items" }: BulkDeleteBarProps) {
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
    <div className="border-border bg-surface sticky bottom-0 z-10 border-t px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-primary-100 text-primary-700 text-body inline-flex items-center rounded-full px-3 py-1 font-medium">{selectedCount} selected</span>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear selection
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-danger-600 text-body">
                Delete {selectedCount} {entityName}?
              </span>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting} loading={deleting}>
                {deleting ? "Deleting…" : "Confirm Delete"}
              </Button>
            </>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)} iconLeft={<TrashIcon className="size-4" />}>
              Delete Selected
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
