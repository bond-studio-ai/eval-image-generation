'use client';

import {
  DesignSettingsEditor,
  designSettingsHasValues,
  type DesignSettingsValue,
} from '@/components/design-settings-editor';
import { DesignPackageSelect } from '@/components/design-package-select';
import { LayoutPresetSelect } from '@/components/layout-preset-select';
import { SceneImageInput } from '@/components/scene-image-input';
import { serviceUrl } from '@/lib/api-base';
import {
  designSettingsFromPackage,
  isPowderRoomLayoutName,
  type DesignPackageOption,
} from '@/lib/design-package';
import { INPUT_PRESET_DESIGN_FIELD_KEYS, INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY } from '@/lib/input-preset-design';
import { INPUT_PRESET_RETAILER_ID } from '@/lib/input-preset-retailer';
import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ResourceFormHeader, ErrorCard } from '@/components/resource-form-header';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [layoutTypeId, setLayoutTypeId] = useState(initialData.layoutTypeId ?? '');
  const [layoutTypeName, setLayoutTypeName] = useState<string | null>(null);
  const [pkgId, setPkgId] = useState(initialData.pkgId ?? '');
  const [dollhouseView, setDollhouseView] = useState(initialData.dollhouseView);
  const [realPhoto, setRealPhoto] = useState(initialData.realPhoto);
  const [moodBoard, setMoodBoard] = useState(initialData.moodBoard);
  const [arbitraryImagesBySlot, setArbitraryImagesBySlot] = useState<Record<string, string | null>>(
    initialData.arbitraryImagesBySlot
  );
  const [designSettings, setDesignSettings] = useState<DesignSettingsValue>(initialData.designSettings);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyImage =
    Object.values(arbitraryImagesBySlot).some((url) => !!url) ||
    !!dollhouseView ||
    !!realPhoto ||
    !!moodBoard;
  const layoutRequiresPackage = layoutTypeId.trim().length > 0;
  const hasValidLayoutConfig = !layoutRequiresPackage || pkgId.trim().length > 0;

  const canSave =
    name.trim() &&
    hasValidLayoutConfig &&
    (layoutTypeId.trim().length > 0 || hasAnyImage || designSettingsHasValues(designSettings));

  function handlePackageChange(nextPkgId: string, pkg?: DesignPackageOption | null) {
    setPkgId(nextPkgId);
    if (!pkg) return;
    setArbitraryImagesBySlot({});
    setDesignSettings(
      designSettingsFromPackage(pkg, { isPowderRoom: isPowderRoomLayoutName(layoutTypeName) })
    );
  }

  function handleLayoutChange(value: string, option?: { name?: string | null } | null) {
    setLayoutTypeId(value);
    setLayoutTypeName(option?.name ?? null);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        layout_type_id: layoutTypeId.trim() || null,
        pkg_id: pkgId.trim() || null,
        dollhouse_view: dollhouseView,
        real_photo: realPhoto,
        mood_board: moodBoard,
      };
      for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
        payload[key] = designSettings?.[key] ?? null;
      }
      for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        if (designSettings?.[`${slot}ImageType`] === 'arbitrary') {
          payload[urlColumn] = arbitraryImagesBySlot[slot] ?? null;
        } else {
          payload[urlColumn] = null;
        }
      }

      const url = serviceUrl(`input-presets/${initialData.id}`) + (force ? '?force=true' : '');
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error(
          res.redirected || res.status === 401
            ? 'Session expired. Please refresh the page.'
            : `Unexpected response from server (${res.status}). Please try again.`,
        );
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to update');
      }

      router.push(`/input-presets/${initialData.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
          <PrimaryButton onClick={handleSave} disabled={!canSave || saving} loading={saving}>
            {saving ? 'Saving...' : 'Update Input Preset'}
          </PrimaryButton>
        }
      />

      <div className="mt-6">
        <ResourceFormHeader
          name={name}
          onNameChange={setName}
          namePlaceholder="e.g. Master bathroom with marble tiles"
          description={description}
          onDescriptionChange={setDescription}
        />
      </div>

      {error && <div className="mt-4"><ErrorCard message={error} /></div>}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Room Preset</h2>
        <LayoutPresetSelect
          value={layoutTypeId}
          onChange={handleLayoutChange}
          onResolvedOptionChange={(option) => setLayoutTypeName(option?.name ?? null)}
        />
        <div className="mt-4">
          <DesignPackageSelect
            value={pkgId}
            onChange={handlePackageChange}
            retailerId={INPUT_PRESET_RETAILER_ID}
          />
        </div>
        {layoutRequiresPackage && !hasValidLayoutConfig ? (
          <p className="mt-3 text-sm text-amber-700">
            Select a design package to save a preset with a room layout.
          </p>
        ) : null}
      </div>

      <details className="mt-6 rounded-lg border border-gray-200 bg-white shadow-xs" open={hasAnyImage}>
        <summary className="cursor-pointer list-none px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase">Scene Images</h2>
              <p className="mt-1 text-xs text-gray-500">
                Optional manual dollhouse, real photo, and mood board overrides.
              </p>
            </div>
            <span className="text-xs font-medium text-gray-500">
              {[dollhouseView, realPhoto, moodBoard].filter(Boolean).length} saved
            </span>
          </div>
        </summary>
        <div className="border-t border-gray-100 px-6 py-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SceneImageInput label="Dollhouse View" value={dollhouseView} onChange={setDollhouseView} />
            <SceneImageInput label="Real Photo" value={realPhoto} onChange={setRealPhoto} />
            <SceneImageInput label="Mood Board" value={moodBoard} onChange={setMoodBoard} />
          </div>
        </div>
      </details>

      <div className="mt-6">
        <DesignSettingsEditor
          value={designSettings}
          onChange={setDesignSettings}
          arbitraryImagesBySlot={arbitraryImagesBySlot}
          onArbitraryImagesBySlotChange={setArbitraryImagesBySlot}
          savedImageUrlsBySlot={initialData.savedImageUrlsBySlot}
          retailerId={INPUT_PRESET_RETAILER_ID}
        />
      </div>

    </div>
  );
}
