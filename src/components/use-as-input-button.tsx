'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { withImageParams } from '@/lib/image-utils';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const SCENE_FIELDS = [
  { key: 'dollhouse_view', label: 'Dollhouse View' },
  { key: 'real_photo', label: 'Real Photo' },
  { key: 'mood_board', label: 'Mood Board' },
] as const;

interface InputPresetOption {
  id: string;
  name: string | null;
  createdAt: string;
}

interface UseAsInputButtonProps {
  imageUrl: string;
}

export function UseAsInputButton({ imageUrl }: UseAsInputButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [presets, setPresets] = useState<InputPresetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string>(SCENE_FIELDS[0].key);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showModal) return;
    setLoading(true);
    fetch('/api/v1/input-presets?limit=100&sort=created_at&order=desc')
      .then((r) => r.json())
      .then((r) => {
        const items = r.data ?? [];
        setPresets(items);
        if (items.length > 0 && !selectedPresetId) {
          setSelectedPresetId(items[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const handleSave = useCallback(async () => {
    if (!selectedPresetId) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/input-presets/${selectedPresetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [selectedField]: imageUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || 'Failed to update preset');
        return;
      }

      setShowModal(false);
      router.push(`/generate?input_preset_id=${selectedPresetId}`);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }, [selectedPresetId, selectedField, imageUrl, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        Use as Input
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Use as Input</h3>
            <p className="mt-1 text-sm text-gray-600">
              Replace a scene field in an input preset with this output image.
            </p>

            <div className="mt-4 flex justify-center">
              <ImageWithSkeleton
                src={withImageParams(imageUrl)}
                alt="Selected output"
                loading="lazy"
                wrapperClassName="h-32 w-32 rounded-lg border border-gray-200 bg-gray-50"
              />
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-4">
                <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : presets.length === 0 ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  No input presets found. Create one first from the Input Presets page.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="use-as-input-preset" className="mb-1 block text-sm font-medium text-gray-700">
                    Input Preset
                  </label>
                  <select
                    id="use-as-input-preset"
                    value={selectedPresetId ?? ''}
                    onChange={(e) => setSelectedPresetId(e.target.value || null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                  >
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || 'Untitled'} ({new Date(p.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Replace Field
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SCENE_FIELDS.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setSelectedField(f.key)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedField === f.key
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedPresetId || saving || presets.length === 0}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save & Go to Generate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
