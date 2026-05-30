"use client";

import { Spinner } from "@/components/ui/spinner";

export function SaveActionBar({ onSave, disabled, saving, isEditing }: { onSave: () => void; disabled: boolean; saving: boolean; isEditing: boolean }) {
  return (
    <div className="flex justify-end">
      <button type="button" onClick={onSave} disabled={disabled} className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors">
        {saving ? (
          <>
            <Spinner className="size-4" />
            Saving…
          </>
        ) : isEditing ? (
          "Update Strategy"
        ) : (
          "Create Strategy"
        )}
      </button>
    </div>
  );
}
