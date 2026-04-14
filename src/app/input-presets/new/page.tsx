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

export default function NewInputPresetPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [layoutTypeId, setLayoutTypeId] = useState('');
  const [layoutTypeName, setLayoutTypeName] = useState<string | null>(null);
  const [pkgId, setPkgId] = useState('');
  const [dollhouseView, setDollhouseView] = useState<string | null>(null);
  const [realPhoto, setRealPhoto] = useState<string | null>(null);
  const [moodBoard, setMoodBoard] = useState<string | null>(null);
  const [arbitraryImagesBySlot, setArbitraryImagesBySlot] = useState<Record<string, string | null>>({});
  const [designSettings, setDesignSettings] = useState<DesignSettingsValue>(null);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyImage =
    Object.values(arbitraryImagesBySlot).some((url) => !!url) ||
    !!dollhouseView ||
    !!realPhoto ||
    !!moodBoard;
  const layoutRequiresPackage = layoutTypeId.trim().length > 0;
  const hasValidLayoutConfig = !layoutRequiresPackage || pkgId.trim().length > 0;

  const canCreate =
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

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      if (designSettings) {
        for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
          const value = designSettings[key];
          if (value !== undefined) payload[key] = value;
        }
      }
      if (layoutTypeId.trim()) payload.layout_type_id = layoutTypeId.trim();
      if (pkgId.trim()) payload.pkg_id = pkgId.trim();
      if (dollhouseView) payload.dollhouse_view = dollhouseView;
      if (realPhoto) payload.real_photo = realPhoto;
      if (moodBoard) payload.mood_board = moodBoard;
      for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        if (designSettings?.[`${slot}ImageType`] === 'arbitrary') {
          payload[urlColumn] = arbitraryImagesBySlot[slot] ?? null;
        }
      }

      const res = await fetch(serviceUrl('input-presets'), {
        method: 'POST',
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
        throw new Error(json.error?.message || 'Failed to create');
      }

      router.push(`/input-presets/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
          <PrimaryButton onClick={handleCreate} disabled={!canCreate || creating} loading={creating}>
            {creating ? 'Creating...' : 'Create Input Preset'}
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

      {/* Room preset */}
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
          savedImageUrlsBySlot={{}}
          retailerId={INPUT_PRESET_RETAILER_ID}
        />
      </div>

    </div>
  );
}
