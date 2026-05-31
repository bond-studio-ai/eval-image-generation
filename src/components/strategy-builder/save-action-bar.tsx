"use client";

import { Button } from "@/components/ui/button";

function saveButtonLabel(saving: boolean, isEditing: boolean): string {
  if (saving) return "Saving…";
  return isEditing ? "Update Strategy" : "Create Strategy";
}

export function SaveActionBar({ onSave, disabled, saving, isEditing }: { onSave: () => void; disabled: boolean; saving: boolean; isEditing: boolean }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={disabled} loading={saving} className="px-6 py-2.5">
        {saveButtonLabel(saving, isEditing)}
      </Button>
    </div>
  );
}
