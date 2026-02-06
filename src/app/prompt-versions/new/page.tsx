'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewPromptVersionPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [model, setModel] = useState('');
  const [outputType, setOutputType] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [outputResolution, setOutputResolution] = useState('');
  const [temperature, setTemperature] = useState('');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = systemPrompt.trim() && userPrompt.trim();

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/prompt-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          model: model || undefined,
          output_type: outputType || undefined,
          aspect_ratio: aspectRatio || undefined,
          output_resolution: outputResolution || undefined,
          temperature: temperature ? parseFloat(temperature) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create');
      }

      const { data } = await res.json();
      router.push(`/prompt-versions/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCreating(false);
    }
  }

  const editableInput =
    'w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1';

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/prompt-versions" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Prompt Versions
          </Link>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Prompt Version"
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

      {/* Stats placeholder — mirrors the detail page structure */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {['Generations', 'Rated', 'Avg Rating', 'Unrated'].map((label) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">-</p>
          </div>
        ))}
      </div>

      {/* Prompts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold uppercase text-gray-900">
            System Prompt <span className="text-red-500">*</span>
          </h2>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            placeholder="System prompt that sets AI context and behavior..."
            className={`mt-3 font-mono ${editableInput}`}
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold uppercase text-gray-900">
            User Prompt <span className="text-red-500">*</span>
          </h2>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={8}
            placeholder="User-facing prompt template. Use {placeholders} for dynamic content."
            className={`mt-3 font-mono ${editableInput}`}
          />
        </div>
      </div>

      {/* Model Settings */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold uppercase text-gray-900">Model Settings</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label className="text-xs font-medium text-gray-600">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-image-1"
              className={`mt-1 ${editableInput}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Output Type</label>
            <input
              type="text"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
              placeholder="e.g. image"
              className={`mt-1 ${editableInput}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Aspect Ratio</label>
            <input
              type="text"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              placeholder="e.g. 16:9"
              className={`mt-1 ${editableInput}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Resolution</label>
            <input
              type="text"
              value={outputResolution}
              onChange={(e) => setOutputResolution(e.target.value)}
              placeholder="e.g. 1024x1024"
              className={`mt-1 ${editableInput}`}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Temperature</label>
            <input
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g. 0.7"
              className={`mt-1 ${editableInput}`}
            />
          </div>
        </div>
      </div>

      {/* Generations placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        <p className="mt-4 text-sm text-gray-600">
          No generations yet. Create this prompt version first, then generate images.
        </p>
      </div>

      {/* Sticky create bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {!canCreate && (
              <p className="text-sm text-gray-500">
                Fill in the system prompt and user prompt to create.
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
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {creating ? 'Creating...' : 'Create Prompt Version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
