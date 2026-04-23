'use client';

import { PageHeader } from '@/components/page-header';
import { ResourceFormHeader, ErrorCard } from '@/components/resource-form-header';
import { serviceUrl } from '@/lib/api-base';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DeletePromptVersionButton } from './delete-prompt-version-button';
import { PromptTemplateEditor } from './prompt-template-editor';
import { RatingBadge } from './rating-badge';
import { TwoPaneSplit } from './two-pane-split';

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
  });

  // Editable field state
  const [name, setName] = useState(baseline.name);
  const [description, setDescription] = useState(baseline.description);
  const [systemPrompt, setSystemPrompt] = useState(baseline.systemPrompt);
  const [userPrompt, setUserPrompt] = useState(baseline.userPrompt);

  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!isEditable) return false;
    return (
      name !== baseline.name ||
      description !== baseline.description ||
      systemPrompt !== baseline.systemPrompt ||
      userPrompt !== baseline.userPrompt
    );
  }, [isEditable, baseline, name, description, systemPrompt, userPrompt]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(serviceUrl(`prompt-versions/${data.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
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
    setError(null);
  }

  async function handleClone() {
    setCloning(true);
    setError(null);
    try {
      const res = await fetch(serviceUrl('prompt-versions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Copy of ${data.name || 'Untitled'}`,
          description: data.description || undefined,
          system_prompt: data.systemPrompt,
          user_prompt: data.userPrompt,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message || 'Failed to clone');
      }
      const json = await res.json();
      const newId = json.data?.id;
      if (newId) router.push(`/prompt-versions/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clone failed');
    } finally {
      setCloning(false);
    }
  }

  // Shared classes for editable inline fields
  const editableInput =
    'w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1';

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/prompt-versions"
        backLabel="Back to Prompt Versions"
        title={isEditable ? '' : (data.name || 'Untitled Prompt Version')}
        subtitle={!isEditable ? data.description ?? undefined : undefined}
        actions={
          <>
            {isDirty && (
              <>
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
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
                >
                  {saving && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            {generations.length > 0 && !data.deletedAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Locked
              </span>
            )}
            <button
              type="button"
              onClick={handleClone}
              disabled={cloning}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              {cloning ? 'Cloning…' : 'Clone'}
            </button>
            {isEditable && (
              <DeletePromptVersionButton id={data.id} name={name || 'Untitled Prompt Version'} />
            )}
            {!data.deletedAt && (
              <Link
                href="/executions"
                className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
              >
                New Run
              </Link>
            )}
            {data.deletedAt && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                Deleted
              </span>
            )}
          </>
        }
      />

      {isEditable && (
        <div className="mt-6">
          <ResourceFormHeader
            name={name}
            onNameChange={setName}
            namePlaceholder="e.g. Bathroom generation v2"
            nameRequired={false}
            description={description}
            onDescriptionChange={setDescription}
          />
        </div>
      )}

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
      <TwoPaneSplit
        className="mt-8"
        left={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">System Prompt</h2>
            {isEditable ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <PromptTemplateEditor
                  value={systemPrompt}
                  onChange={setSystemPrompt}
                  placeholder="Enter the system prompt. Use {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                  className={`font-mono ${editableInput}`}
                  fillHeight
                />
              </div>
            ) : (
              <pre className="mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
                {data.systemPrompt}
              </pre>
            )}
          </div>
        }
        right={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">User Prompt</h2>
            {isEditable ? (
              <div className="mt-3 flex min-h-0 flex-1 flex-col">
                <PromptTemplateEditor
                  value={userPrompt}
                  onChange={setUserPrompt}
                  placeholder="Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                  className={`font-mono ${editableInput}`}
                  fillHeight
                />
              </div>
            ) : (
              <pre className="mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm text-gray-700">
                {data.userPrompt}
              </pre>
            )}
          </div>
        }
      />

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

      {error && <div className="mt-4"><ErrorCard message={error} /></div>}
    </div>
  );
}
