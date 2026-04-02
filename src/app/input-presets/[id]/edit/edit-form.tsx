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
import { designSettingsFromPackage, type DesignPackageOption } from '@/lib/design-package';
import { INPUT_PRESET_DESIGN_FIELD_KEYS, INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY } from '@/lib/input-preset-design';
import { INPUT_PRESET_RETAILER_ID } from '@/lib/input-preset-retailer';
import Link from 'next/link';
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
  productUrlValues: Record<string, string | null>;
  savedImageUrlsBySlot: Record<string, string | null>;
}

export function InputPresetEditForm({ initialData, force }: { initialData: InitialData; force?: boolean }) {
  const router = useRouter();

  const [name, setName] = useState(initialData.name);
  const [description, setDescription] = useState(initialData.description);
  const [layoutTypeId, setLayoutTypeId] = useState(initialData.layoutTypeId ?? '');
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
    setDesignSettings(designSettingsFromPackage(pkg));
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
      if (designSettings) {
        for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
          const value = designSettings[key];
          if (value !== undefined) payload[key] = value;
        }
      }
      for (const urlColumn of Object.values(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        payload[urlColumn] = initialData.productUrlValues[urlColumn] ?? null;
      }
      for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
        if (designSettings?.[`${slot}ImageType`] === 'arbitrary') {
          payload[urlColumn] = arbitraryImagesBySlot[slot] ?? null;
        } else if (initialData.arbitraryImagesBySlot[slot]) {
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
    <div className="pb-20">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href={`/input-presets/${initialData.id}`} className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to preset
          </Link>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Input Preset"
            className="mt-2 block w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-2xl font-bold text-gray-900 transition-colors placeholder:text-gray-300 hover:border-gray-300 focus:border-primary-500 focus:ring-0 focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="mt-1 block w-full border-0 border-b border-transparent bg-transparent px-0 py-0.5 text-sm text-gray-600 transition-colors placeholder:text-gray-300 hover:border-gray-300 focus:border-primary-500 focus:ring-0 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Room Preset</h2>
        <LayoutPresetSelect value={layoutTypeId} onChange={setLayoutTypeId} />
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {!canSave && (
              <p className="text-sm text-gray-500">
                {!name.trim()
                  ? 'Give this preset a name.'
                  : !hasValidLayoutConfig
                    ? 'Pick a design package for the selected layout.'
                    : 'Add a layout, scene image, product image, or design setting to save.'}
              </p>
            )}
            {canSave && <p className="text-sm font-medium text-gray-700">Ready to save</p>}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Link
              href={`/input-presets/${initialData.id}`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {saving && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {saving ? 'Saving...' : 'Update Input Preset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
