'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DeletePromptVersionButton } from './delete-prompt-version-button';
import { RatingBadge } from './rating-badge';

// ------------------------------------
// Types
// ------------------------------------

interface SerializedGeneration {
  id: string;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  createdAt: string;
  inputImageCount: number;
  outputImageCount: number;
}

interface PromptVersionData {
  id: string;
  name: string | null;
  description: string | null;
  systemPrompt: string;
  userPrompt: string;
  model: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
  deletedAt: string | null;
}

interface Stats {
  generationCount: number;
  ratedCount: number;
  avgRating: string | null;
  unratedCount: number;
}

interface PromptVersionDetailProps {
  data: PromptVersionData;
  generations: SerializedGeneration[];
  stats: Stats;
}

// ------------------------------------
// Component
// ------------------------------------

export function PromptVersionDetail({ data, generations, stats }: PromptVersionDetailProps) {
  const router = useRouter();
  const isEditable = generations.length === 0 && !data.deletedAt;

  // Baseline values (updated on save) — must be state so isDirty recalculates
  const [baseline, setBaseline] = useState({
    name: data.name ?? '',
    description: data.description ?? '',
    systemPrompt: data.systemPrompt,
    userPrompt: data.userPrompt,
    model: data.model ?? 'gemini-2.5-flash-image',
    aspectRatio: data.aspectRatio ?? '1:1',
    outputResolution: data.outputResolution ?? '1K',
    temperature: data.temperature ?? '',
  });

  // Editable field state
  const [name, setName] = useState(baseline.name);
  const [description, setDescription] = useState(baseline.description);
  const [systemPrompt, setSystemPrompt] = useState(baseline.systemPrompt);
  const [userPrompt, setUserPrompt] = useState(baseline.userPrompt);
  const [model, setModel] = useState(baseline.model);
  const [aspectRatio, setAspectRatio] = useState(baseline.aspectRatio);
  const [outputResolution, setOutputResolution] = useState(baseline.outputResolution);
  const [temperature, setTemperature] = useState(baseline.temperature);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!isEditable) return false;
    return (
      name !== baseline.name ||
      description !== baseline.description ||
      systemPrompt !== baseline.systemPrompt ||
      userPrompt !== baseline.userPrompt ||
      model !== baseline.model ||
      aspectRatio !== baseline.aspectRatio ||
      outputResolution !== baseline.outputResolution ||
      temperature !== baseline.temperature
    );
  }, [isEditable, baseline, name, description, systemPrompt, userPrompt, model, aspectRatio, outputResolution, temperature]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/prompt-versions/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          model: model || null,
          aspect_ratio: aspectRatio || null,
          output_resolution: outputResolution || null,
          temperature: temperature ? Number(temperature) : null,
        }),
      });

      if (!res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const d = await res.json();
          throw new Error(d.error?.message || 'Failed to save');
        }
        throw new Error(res.status === 401 || res.redirected ? 'Session expired. Please refresh the page.' : `Failed to save (${res.status})`);
      }

      // Update baseline so isDirty resets
      setBaseline({
        name,
        description,
        systemPrompt,
        userPrompt,
        model,
        aspectRatio,
        outputResolution,
        temperature,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setName(baseline.name);
    setDescription(baseline.description);
    setSystemPrompt(baseline.systemPrompt);
    setUserPrompt(baseline.userPrompt);
    setModel(baseline.model);
    setAspectRatio(baseline.aspectRatio);
    setOutputResolution(baseline.outputResolution);
    setTemperature(baseline.temperature);
    setError(null);
  }

  // Shared classes for editable inline fields
  const editableInput =
    'w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1';

  const hasModelSettings = isEditable || model || aspectRatio || outputResolution || temperature;

  return (
    <div className={isDirty ? 'pb-20' : ''}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/prompt-versions" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Prompt Versions
          </Link>

          {isEditable ? (
            <>
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
            </>
          ) : (
            <>
              <h1 className="mt-2 text-2xl font-bold text-gray-900">
                {data.name || 'Untitled Prompt Version'}
              </h1>
              {data.description && (
                <p className="mt-1 text-sm text-gray-600">{data.description}</p>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {generations.length > 0 && !data.deletedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              Locked
            </span>
          )}
          {isEditable && (
            <DeletePromptVersionButton id={data.id} name={name || 'Untitled Prompt Version'} />
          )}
          {!data.deletedAt && (
            <Link
              href={`/generate?prompt_version_id=${data.id}`}
              className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                />
              </svg>
              Generate Image
            </Link>
          )}
          {data.deletedAt && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
              Deleted
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Generations</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.generationCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Rated</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.ratedCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Avg Rating</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{stats.avgRating ?? '-'}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-sm font-medium text-gray-600">Unrated</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.unratedCount}</p>
        </div>
      </div>

      {/* Prompts */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold uppercase text-gray-900">System Prompt</h2>
          {isEditable ? (
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="Enter the system prompt..."
              className={`mt-3 font-mono ${editableInput}`}
            />
          ) : (
            <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
              {data.systemPrompt}
            </pre>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold uppercase text-gray-900">User Prompt</h2>
          {isEditable ? (
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={8}
              placeholder="Enter the user prompt..."
              className={`mt-3 font-mono ${editableInput}`}
            />
          ) : (
            <pre className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
              {data.userPrompt}
            </pre>
          )}
        </div>
      </div>

      {/* Model Settings */}
      {hasModelSettings && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold uppercase text-gray-900">Model Settings</h2>

          {isEditable ? (
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={`mt-1 ${editableInput}`}
                >
                  <option value="gemini-2.5-flash-image">Nano Banana</option>
                  <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={`mt-1 ${editableInput}`}
                >
                  <option value="1:1">1:1 (Square)</option>
                  <option value="2:3">2:3 (Portrait)</option>
                  <option value="3:2">3:2 (Landscape)</option>
                  <option value="3:4">3:4 (Portrait)</option>
                  <option value="4:3">4:3 (Landscape)</option>
                  <option value="4:5">4:5 (Portrait)</option>
                  <option value="5:4">5:4 (Landscape)</option>
                  <option value="9:16">9:16 (Tall Portrait)</option>
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="21:9">21:9 (Ultra-wide)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Resolution</label>
                <select
                  value={outputResolution}
                  onChange={(e) => setOutputResolution(e.target.value)}
                  className={`mt-1 ${editableInput}`}
                >
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Temperature</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="2"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="e.g. 0.7"
                  className={`mt-1 ${editableInput}`}
                />
              </div>
            </div>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.model && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Model</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {data.model === 'gemini-2.5-flash-image' ? 'Nano Banana' :
                     data.model === 'gemini-3-pro-image-preview' ? 'Nano Banana Pro' :
                     data.model}
                  </dd>
                </div>
              )}
              {data.aspectRatio && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Aspect Ratio</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{data.aspectRatio}</dd>
                </div>
              )}
              {data.outputResolution && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Resolution</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {data.outputResolution}
                  </dd>
                </div>
              )}
              {data.temperature && (
                <div>
                  <dt className="text-xs font-medium text-gray-600">Temperature</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{data.temperature}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {/* Generations List */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        {generations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            No generations yet for this prompt version.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Inputs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Outputs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Link href={`/generations/${gen.id}`}>
                        <div className="flex gap-1">
                          <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
                          <RatingBadge rating={gen.productAccuracyRating} label="Product" />
                        </div>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {gen.inputImageCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {gen.outputImageCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <p className="text-sm font-medium text-gray-700">Unsaved changes</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {saving && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
