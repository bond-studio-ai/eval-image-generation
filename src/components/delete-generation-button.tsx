"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TrashIcon } from "@/components/ui/icons";
import { serviceUrl } from "@/lib/api-base";

interface DeleteGenerationButtonProps {
  generationId: string;
  /** 'icon' renders a compact trash icon; 'button' renders a full text button */
  variant?: "icon" | "button";
}

export function DeleteGenerationButton({ generationId, variant = "button" }: DeleteGenerationButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(serviceUrl(`generations/${generationId}`), {
        method: "DELETE"
      });

      if (res.ok || res.status === 204) {
        router.push("/generations");
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
        <span className="text-danger-600 text-caption">Delete?</span>
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting} loading={deleting}>
          {deleting ? "Deleting..." : "Yes"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setConfirming(false);
          }}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <IconButton
        variant="danger"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        label="Delete generation"
        icon={<TrashIcon />}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setConfirming(true);
      }}
      className="border-danger-200 text-danger-600 hover:bg-danger-50 text-body inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-medium transition-colors"
    >
      <TrashIcon className="size-4" />
      Delete
    </button>
  );
}
