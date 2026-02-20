'use client';

import { ImageUpload } from '@/components/image-upload';
import { ProductImageInput, type ProductImagesState } from '@/components/product-image-input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewInputPresetPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [productImages, setProductImages] = useState<ProductImagesState>({});
  const [arbitraryImages, setArbitraryImages] = useState<{ url: string; tag?: string }[]>([]);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyImage =
    Object.values(productImages).some(Boolean) ||
    arbitraryImages.length > 0;

  const canCreate = name.trim() && hasAnyImage;

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      for (const [key, url] of Object.entries(productImages)) {
        if (url) payload[key] = url;
      }
      if (arbitraryImages.length > 0) payload.arbitrary_images = arbitraryImages;

      const res = await fetch('/api/v1/input-presets', {
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
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/input-presets" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Input Presets
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

      {/* Product Images */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Product Images</h2>
        <ProductImageInput value={productImages} onChange={setProductImages} />
      </div>

      {/* Arbitrary images (not tied to a specific attribute) */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Arbitrary Images</h2>
        <p className="mb-4 text-sm text-gray-600">
          Optional images to include with this preset. You can tag each image so the tag is sent to the model as context.
        </p>
        <ImageUpload
          label=""
          maxImages={10}
          images={arbitraryImages.map((a, i) => ({ url: a.url, name: a.tag || `Image ${i + 1}`, previewUrl: a.url }))}
          onImagesChange={(imgs) =>
            setArbitraryImages(imgs.map((img) => ({
              url: img.url,
              tag: arbitraryImages.find((a) => a.url === img.url)?.tag,
            })))
          }
          renderAboveImage={(idx) => (
            <input
              type="text"
              value={arbitraryImages[idx]?.tag ?? ''}
              onChange={(e) =>
                setArbitraryImages((prev) =>
                  prev.map((a, i) => (i === idx ? { ...a, tag: e.target.value || undefined } : a)),
                )
              }
              placeholder="Tag (optional)"
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          )}
        />
      </div>

      {/* Sticky create bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {!canCreate && (
              <p className="text-sm text-gray-500">
                {!name.trim()
                  ? 'Give this preset a name.'
                  : 'Add at least one image to create.'}
              </p>
            )}
            {canCreate && (
              <p className="text-sm font-medium text-gray-700">Ready to create</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={creating}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {creating && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {creating ? 'Creating...' : 'Create Input Preset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
