'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangleIcon, TrashIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { serviceUrl } from '@/lib/api-base';

interface DeletePromptVersionButtonProps {
  id: string;
  name: string;
}

export function DeletePromptVersionButton({ id, name }: DeletePromptVersionButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(serviceUrl(`prompt-versions/${id}`), {
        method: 'DELETE',
      });

      if (res.status === 204) {
        router.push('/prompt-versions');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to delete');
      }

      router.push('/prompt-versions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-xs transition-colors hover:bg-red-50"
      >
        <TrashIcon className="size-4" />
        Delete
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <Modal
          onClose={() => !deleting && setShowConfirm(false)}
          labelledById="delete-prompt-version-title"
          backdropClassName="bg-black/50"
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="size-5 text-red-600" />
            </div>
            <div>
              <h3 id="delete-prompt-version-title" className="text-lg font-semibold text-gray-900">
                Delete Prompt Version
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Are you sure you want to delete <strong>{name || 'this prompt version'}</strong>?
                This action cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={deleting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
            >
              {deleting && <Spinner className="size-4" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
