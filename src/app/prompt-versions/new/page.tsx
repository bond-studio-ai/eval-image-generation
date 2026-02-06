'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewPromptVersionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const body = {
      name: form.get('name') as string,
      system_prompt: form.get('system_prompt') as string,
      user_prompt: form.get('user_prompt') as string,
      description: form.get('description') as string,
      model: form.get('model') as string,
      output_type: form.get('output_type') as string,
      aspect_ratio: form.get('aspect_ratio') as string,
      output_resolution: form.get('output_resolution') as string,
      temperature: form.get('temperature')
        ? parseFloat(form.get('temperature') as string)
        : undefined,
    };

    try {
      const res = await fetch('/api/v1/prompt-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create');
      }

      const { data } = await res.json();
      router.push(`/prompt-versions/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">New Prompt Version</h1>
      <p className="mt-1 text-sm text-gray-500">
        Create a new prompt version for image generation testing.
      </p>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., Interior Design v2"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                name="description"
                id="description"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="Brief description of this version"
              />
            </div>

            <div>
              <label htmlFor="system_prompt" className="block text-sm font-medium text-gray-700">
                System Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                name="system_prompt"
                id="system_prompt"
                rows={4}
                required
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="System prompt that sets AI context and behavior..."
              />
            </div>

            <div>
              <label htmlFor="user_prompt" className="block text-sm font-medium text-gray-700">
                User Prompt <span className="text-red-500">*</span>
              </label>
              <textarea
                name="user_prompt"
                id="user_prompt"
                rows={4}
                required
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="User-facing prompt template. Use {placeholders} for dynamic content."
              />
            </div>
          </div>
        </div>

        {/* Model Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900">Model Settings</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                name="model"
                id="model"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., Nano Banana Pro"
              />
            </div>

            <div>
              <label htmlFor="output_type" className="block text-sm font-medium text-gray-700">
                Output Type
              </label>
              <input
                type="text"
                name="output_type"
                id="output_type"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., Image"
              />
            </div>

            <div>
              <label htmlFor="aspect_ratio" className="block text-sm font-medium text-gray-700">
                Aspect Ratio
              </label>
              <input
                type="text"
                name="aspect_ratio"
                id="aspect_ratio"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., 3:2"
              />
            </div>

            <div>
              <label
                htmlFor="output_resolution"
                className="block text-sm font-medium text-gray-700"
              >
                Output Resolution
              </label>
              <input
                type="text"
                name="output_resolution"
                id="output_resolution"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., 1K"
              />
            </div>

            <div>
              <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                Temperature
              </label>
              <input
                type="number"
                name="temperature"
                id="temperature"
                step="0.1"
                min="0"
                max="2"
                className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-xs focus:ring-1 focus:outline-none"
                placeholder="e.g., 0.8"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Prompt Version'}
          </button>
        </div>
      </form>
    </div>
  );
}
