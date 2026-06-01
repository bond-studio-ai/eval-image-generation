"use client";

import { HTTP_NO_CONTENT } from "@/lib/http-status";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, TrashIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { errorEnvelopeSchema } from "@/lib/api/schemas";

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
        method: "DELETE"
      });

      if (res.status === HTTP_NO_CONTENT) {
        router.push("/prompt-versions");
        return;
      }

      if (!res.ok) {
        const data: unknown = await res.json();
        throw new Error(parseOrFallback(errorEnvelopeSchema, data, {}, "prompt version delete").error?.message || "Failed to delete");
      }

      router.push("/prompt-versions");
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setShowConfirm(true);
        }}
        className="border-danger-300 bg-surface text-danger-700 hover:bg-danger-50 text-body inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium shadow-xs transition-colors"
      >
        <TrashIcon className="size-4" />
        Delete
      </button>

      {/* Confirmation modal */}
      {showConfirm && (
        <Modal
          onClose={() => {
            if (!deleting) setShowConfirm(false);
          }}
          labelledById="delete-prompt-version-title"
          backdropClassName="bg-overlay/50"
          className="bg-surface w-full max-w-md rounded-xl p-6 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="bg-danger-100 flex size-10 shrink-0 items-center justify-center rounded-full">
              <AlertTriangleIcon className="text-danger-600 size-5" />
            </div>
            <div>
              <h3 id="delete-prompt-version-title" className="text-text-primary text-h3">
                Delete Prompt Version
              </h3>
              <p className="text-text-secondary text-body mt-1">
                Are you sure you want to delete <strong>{name || "this prompt version"}</strong>? This action cannot be undone.
              </p>
            </div>
          </div>

          {error && <div className="bg-danger-50 text-danger-700 text-body mt-4 rounded-lg p-3">{error}</div>}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirm(false);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} loading={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
