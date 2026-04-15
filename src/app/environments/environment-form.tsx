'use client';

import { PageHeader, PrimaryButton } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface EnvironmentFormProps {
  initialData?: {
    id: string;
    name: string;
    apiHostname: string;
    isActive: boolean;
  };
}

export function EnvironmentForm({ initialData }: EnvironmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name ?? '');
  const [apiHostname, setApiHostname] = useState(initialData?.apiHostname ?? '');
  const [authToken, setAuthToken] = useState('');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() && apiHostname.trim();

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        apiHostname: apiHostname.trim(),
        isActive,
      };
      if (authToken.trim()) payload.authToken = authToken.trim();

      const url = initialData
        ? serviceUrl(`environments/${initialData.id}`)
        : serviceUrl('environments');
      const method = initialData ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? 'Failed to save environment.',
        );
      }

      router.push('/environments');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        backHref="/environments"
        backLabel="Back to Environments"
        title=""
        actions={
          <PrimaryButton onClick={handleSubmit} disabled={!canSave || saving} loading={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Environment'}
          </PrimaryButton>
        }
      />

      {error && <div className="mt-6"><ErrorCard message={error} /></div>}

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              API hostname <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={apiHostname}
              onChange={(e) => setApiHostname(e.target.value)}
              placeholder="api.example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Auth token {isEditing ? '(leave blank to keep current)' : ''}
            </span>
            <div className="flex gap-2">
              <input
                type={showAuthToken ? 'text' : 'password'}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowAuthToken((prev) => !prev)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                aria-label={showAuthToken ? 'Hide auth token' : 'Show auth token'}
              >
                {showAuthToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Environment is active</span>
          </label>
        </div>
      </div>
    </div>
  );
}
