"use client";

import { useRouter } from "next/navigation";
import { useReducer, useState } from "react";
import { DesignPackageSelect } from "@/components/design-package-select";
import { DesignSettingsEditor, type DesignSettingsValue } from "@/components/design-settings-editor";
import { designSettingsHasValues } from "@/components/design-settings-values";
import { LayoutPresetSelect, useLayoutPresets } from "@/components/layout-preset-select";
import { PageHeader } from "@/components/page-header";
import { ErrorCard, ResourceFormHeader } from "@/components/resource-form-header";
import { SceneImageInput } from "@/components/scene-image-input";
import { Button } from "@/components/ui/button";
import { assertNever } from "@/lib/assert-never";
import { serviceUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { mutationResponseSchema } from "@/lib/api/schemas";
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

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  layoutTypeId: "",
  pkgId: "",
  dollhouseView: null,
  realPhoto: null,
  moodBoard: null,
  arbitraryImagesBySlot: {},
  designSettings: null
};

export function NewInputPresetForm() {
  const router = useRouter();

  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM);
  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: "setField", field, value } as FormAction);
  };

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { options: layoutPresets } = useLayoutPresets();
  const layoutTypeName = layoutPresets.find((option) => option.id === form.layoutTypeId)?.name ?? null;

  const hasAnyImage = Object.values(form.arbitraryImagesBySlot).some(Boolean) || Boolean(form.dollhouseView) || Boolean(form.realPhoto) || Boolean(form.moodBoard);
  const layoutRequiresPackage = form.layoutTypeId.trim().length > 0;
  const hasValidLayoutConfig = !layoutRequiresPackage || form.pkgId.trim().length > 0;

  const canCreate = form.name.trim() && hasValidLayoutConfig && (form.layoutTypeId.trim().length > 0 || hasAnyImage || designSettingsHasValues(form.designSettings));

  function handlePackageChange(nextPkgId: string, pkg?: DesignPackageOption | null) {
    setField("pkgId", nextPkgId);
    if (!pkg) return;
    setField("arbitraryImagesBySlot", {});
    setField("designSettings", designSettingsFromPackage(pkg, { isPowderRoom: isPowderRoomLayoutName(layoutTypeName) }));
  }

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || undefined
      };

      if (form.designSettings) {
        for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
          const value = form.designSettings[key];
          if (value !== undefined) payload[key] = value;
        }
      }
      if (form.layoutTypeId.trim()) payload["layout_type_id"] = form.layoutTypeId.trim();
      if (form.pkgId.trim()) payload["pkg_id"] = form.pkgId.trim();
      if (form.dollhouseView) payload["dollhouse_view"] = form.dollhouseView;
      if (form.realPhoto) payload["real_photo"] = form.realPhoto;
      if (form.moodBoard) payload["mood_board"] = form.moodBoard;
      for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        if (form.designSettings?.[`${slot}ImageType`] === "arbitrary") {
          payload[urlColumn] = form.arbitraryImagesBySlot[slot] ?? null;
        }
      }

      const res = await fetch(serviceUrl("input-presets"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(res.redirected || res.status === 401 ? "Session expired. Please refresh the page." : `Unexpected response from server (${res.status}). Please try again.`);
      }

      const json = parseOrFallback(mutationResponseSchema, await res.json(), {}, "input preset create");

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create");
      }

      const newId = json.data?.id;
      if (newId) router.push(`/input-presets/${newId}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        backHref="/input-presets"
        backLabel="Back to Input Presets"
        title=""
        actions={
          <Button onClick={handleCreate} disabled={!canCreate || creating} loading={creating}>
            {creating ? "Creating..." : "Create Input Preset"}
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

      {/* Room preset */}
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
          savedImageUrlsBySlot={{}}
          retailerId={INPUT_PRESET_RETAILER_ID}
        />
      </div>
    </div>
  );
}
