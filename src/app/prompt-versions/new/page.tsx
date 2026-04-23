'use client';

import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ResourceFormHeader, ErrorCard } from '@/components/resource-form-header';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PromptTemplateEditor } from '@/components/prompt-template-editor';
import { TwoPaneSplit } from '@/components/two-pane-split';

export default function NewPromptVersionPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = systemPrompt.trim() && userPrompt.trim();

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch(serviceUrl('prompt-versions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          description: description || undefined,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
        }),
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

      router.push(`/prompt-versions/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setCreating(false);
    }
  }

  const editableInput =
    'w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1';

  return (
    <div className="flex flex-col">
      <PageHeader
        backHref="/prompt-versions"
        backLabel="Back to Prompt Versions"
        title=""
        actions={
          <PrimaryButton onClick={handleCreate} disabled={!canCreate || creating} loading={creating}>
            {creating ? 'Creating...' : 'Create Prompt Version'}
          </PrimaryButton>
        }
      />

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

      {error && <div className="mt-4"><ErrorCard message={error} /></div>}

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
      <TwoPaneSplit
        className="mt-8"
        left={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">
              System Prompt <span className="text-red-500">*</span>
            </h2>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <PromptTemplateEditor
                value={systemPrompt}
                onChange={setSystemPrompt}
                placeholder="System prompt. Use {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                className={`font-mono ${editableInput}`}
                fillHeight
              />
            </div>
          </div>
        }
        right={
          <div className="flex h-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="shrink-0 text-sm font-semibold uppercase text-gray-900">
              User Prompt <span className="text-red-500">*</span>
            </h2>
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <PromptTemplateEditor
                value={userPrompt}
                onChange={setUserPrompt}
                placeholder="Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}"
                className={`font-mono ${editableInput}`}
                fillHeight
              />
            </div>
          </div>
        }
      />

      {/* Generations placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Generations</h2>
        <p className="mt-4 text-sm text-gray-600">
          No generations yet. Create this prompt version first, then generate images.
        </p>
      </div>

    </div>
  );
}
