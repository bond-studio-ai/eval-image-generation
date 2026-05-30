'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { TrashIcon } from '@/components/ui/icons';
import { serviceUrl } from '@/lib/api-base';

interface DeleteGenerationButtonProps {
  generationId: string;
  /** 'icon' renders a compact trash icon; 'button' renders a full text button */
  variant?: 'icon' | 'button';
}

export function DeleteGenerationButton({
  generationId,
  variant = 'button',
}: DeleteGenerationButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(serviceUrl(`generations/${generationId}`), {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        router.push('/generations');
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }, [generationId, router]);

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-red-600">Delete?</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Yes'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        aria-label="Delete generation"
        title="Delete generation"
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500"
      >
        <TrashIcon className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
    >
      <TrashIcon className="size-4" />
      Delete
    </button>
  );
}
