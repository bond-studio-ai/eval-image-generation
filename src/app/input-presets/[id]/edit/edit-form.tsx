"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { DesignPackageSelect } from "@/components/design-package-select";
import { DesignSettingsEditor } from "@/components/design-settings-editor";
import type { DesignSettingsValue } from "@/components/design-settings-fields";
import { designSettingsHasValues } from "@/components/design-settings-values";
import { LayoutPresetSelect, useLayoutPresets } from "@/components/layout-preset-select";
import { PageHeader } from "@/components/page-header";
import { ErrorCard, ResourceFormHeader } from "@/components/resource-form-header";
import { SceneImageInput } from "@/components/scene-image-input";
import { Button } from "@/components/ui/button";
import { assertNever } from "@/lib/assert-never";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { errorEnvelopeSchema } from "@/lib/api/schemas";
import { type DesignPackageOption, designSettingsFromPackage, isPowderRoomLayoutName } from "@/lib/design-package";
import { INPUT_PRESET_DESIGN_FIELD_KEYS, INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY } from "@/lib/input-preset-design";
import { INPUT_PRESET_RETAILER_ID } from "@/lib/input-preset-retailer";

interface FormState {
  name: string;
  description: string;
  layoutTypeId: string;
  pkgId: string;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  arbitraryImagesBySlot: Record<string, string | null>;
  designSettings: DesignSettingsValue;
}

type FormAction =
  | {
      [K in keyof FormState]: { type: "setField"; field: K; value: FormState[K] };
    }[keyof FormState]
  | { type: "reset"; value: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset": {
      return action.value;
    }
    case "setField": {
      return { ...state, [action.field]: action.value };
    }
    default: {
      return assertNever(action);
    }
  }
}

interface InitialData {
  id: string;
  name: string;
  description: string;
  layoutTypeId: string | null;
  pkgId: string | null;
  dollhouseView: string | null;
  realPhoto: string | null;
  moodBoard: string | null;
  arbitraryImagesBySlot: Record<string, string | null>;
  designSettings: Record<string, unknown> | null;
  savedImageUrlsBySlot: Record<string, string | null>;
}

export function InputPresetEditForm({ initialData, force }: { initialData: InitialData; force?: boolean }) {
  const router = useRouter();

  const [form, dispatch] = useReducer(formReducer, {
    name: initialData.name,
    description: initialData.description,
    layoutTypeId: initialData.layoutTypeId ?? "",
    pkgId: initialData.pkgId ?? "",
    dollhouseView: initialData.dollhouseView,
    realPhoto: initialData.realPhoto,
    moodBoard: initialData.moodBoard,
    arbitraryImagesBySlot: initialData.arbitraryImagesBySlot,
    designSettings: initialData.designSettings
  });
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: "setField", field, value } as FormAction);
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { options: layoutPresets } = useLayoutPresets();
  const layoutTypeName = layoutPresets.find((option) => option.id === form.layoutTypeId)?.name ?? null;

  const hasAnyImage = Object.values(form.arbitraryImagesBySlot).some(Boolean) || Boolean(form.dollhouseView) || Boolean(form.realPhoto) || Boolean(form.moodBoard);
  const layoutRequiresPackage = form.layoutTypeId.trim().length > 0;
  const hasValidLayoutConfig = !layoutRequiresPackage || form.pkgId.trim().length > 0;

  const canSave = form.name.trim() && hasValidLayoutConfig && (form.layoutTypeId.trim().length > 0 || hasAnyImage || designSettingsHasValues(form.designSettings));

  function handlePackageChange(nextPkgId: string, pkg?: DesignPackageOption | null) {
    setField("pkgId", nextPkgId);
    if (!pkg) return;
    setField("arbitraryImagesBySlot", {});
    setField("designSettings", designSettingsFromPackage(pkg, { isPowderRoom: isPowderRoomLayoutName(layoutTypeName) }));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        layout_type_id: form.layoutTypeId.trim() || null,
        pkg_id: form.pkgId.trim() || null,
        dollhouse_view: form.dollhouseView,
        real_photo: form.realPhoto,
        mood_board: form.moodBoard
      };
      for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
        payload[key] = form.designSettings?.[key] ?? null;
      }
      for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        payload[urlColumn] = form.designSettings?.[`${slot}ImageType`] === "arbitrary" ? (form.arbitraryImagesBySlot[slot] ?? null) : null;
      }

      const url = serviceUrl(`input-presets/${initialData.id}`) + (force ? "?force=true" : "");
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(res.redirected || res.status === 401 ? "Session expired. Please refresh the page." : `Unexpected response from server (${res.status}). Please try again.`);
      }

      const json = parseOrFallback(errorEnvelopeSchema, await res.json(), {}, "input preset update");

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update");
      }

      router.push(`/input-presets/${initialData.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        backHref={`/input-presets/${initialData.id}`}
        backLabel="Back to preset"
        title=""
        actions={
          <Button onClick={handleSave} disabled={!canSave || saving} loading={saving}>
            {saving ? "Saving..." : "Update Input Preset"}
          </Button>
        }
      />

      <div className="mt-6">
        <ResourceFormHeader
          name={form.name}
          onNameChange={(value) => {
            setField("name", value);
          }}
          namePlaceholder="e.g. Master bathroom with marble tiles"
          description={form.description}
          onDescriptionChange={(value) => {
            setField("description", value);
          }}
        />
      </div>

      {error && (
        <div className="mt-4">
          <ErrorCard message={error} />
        </div>
      )}

      <div className="border-border bg-surface mt-6 rounded-lg border p-6 shadow-xs">
        <h2 className="text-text-primary text-body mb-4 font-semibold uppercase">Room Preset</h2>
        <LayoutPresetSelect
          value={form.layoutTypeId}
          onChange={(value) => {
            setField("layoutTypeId", value);
          }}
        />
        <div className="mt-4">
          <DesignPackageSelect value={form.pkgId} onChange={handlePackageChange} retailerId={INPUT_PRESET_RETAILER_ID} />
        </div>
        {layoutRequiresPackage && !hasValidLayoutConfig ? <p className="text-warning-700 text-body mt-3">Select a design package to save a preset with a room layout.</p> : null}
      </div>

      <details className="border-border bg-surface mt-6 rounded-lg border shadow-xs" open={hasAnyImage}>
        <summary className="cursor-pointer list-none px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-text-primary text-body font-semibold uppercase">Scene Images</h2>
              <p className="text-text-muted text-caption mt-1">Optional manual dollhouse, real photo, and mood board overrides.</p>
            </div>
            <span className="text-text-muted text-caption font-medium">{[form.dollhouseView, form.realPhoto, form.moodBoard].filter(Boolean).length} saved</span>
          </div>
        </summary>
        <div className="border-border-subtle border-t p-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SceneImageInput
              label="Dollhouse View"
              value={form.dollhouseView}
              onChange={(value) => {
                setField("dollhouseView", value);
              }}
            />
            <SceneImageInput
              label="Real Photo"
              value={form.realPhoto}
              onChange={(value) => {
                setField("realPhoto", value);
              }}
            />
            <SceneImageInput
              label="Mood Board"
              value={form.moodBoard}
              onChange={(value) => {
                setField("moodBoard", value);
              }}
            />
          </div>
        </div>
      </details>

      <div className="mt-6">
        <DesignSettingsEditor
          value={form.designSettings}
          onChange={(value) => {
            setField("designSettings", value);
          }}
          arbitraryImagesBySlot={form.arbitraryImagesBySlot}
          onArbitraryImagesBySlotChange={(value) => {
            setField("arbitraryImagesBySlot", value);
          }}
          savedImageUrlsBySlot={initialData.savedImageUrlsBySlot}
          retailerId={INPUT_PRESET_RETAILER_ID}
        />
      </div>
    </div>
  );
}
