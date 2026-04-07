'use client';

import { serviceUrl } from '@/lib/api-base';
import { useCallback, useEffect, useMemo, useState } from 'react';

type EnvironmentItem = {
  id: string;
  name: string;
  apiHostname: string;
  isActive: boolean;
  hasAuthToken: boolean;
  createdAt: string;
  updatedAt: string;
};

type EnvironmentFormState = {
  id?: string;
  name: string;
  apiHostname: string;
  authToken: string;
  isActive: boolean;
};

const EMPTY_FORM: EnvironmentFormState = {
  name: '',
  apiHostname: '',
  authToken: '',
  isActive: true,
};

export default function EnvironmentsPage() {
  const [items, setItems] = useState<EnvironmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<EnvironmentFormState>(EMPTY_FORM);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(serviceUrl('environments?limit=100'), { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: { message?: string } }).error?.message ?? 'Failed to load environments.');
        setItems([]);
        return;
      }
      setItems(Array.isArray((json as { data?: unknown[] }).data) ? ((json as { data?: EnvironmentItem[] }).data ?? []) : []);
    } catch {
      setError('Failed to load environments.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setShowAuthToken(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        apiHostname: form.apiHostname,
        isActive: form.isActive,
      };
      if (form.authToken.trim()) payload.authToken = form.authToken.trim();
      const url = form.id ? serviceUrl(`environments/${form.id}`) : serviceUrl('environments');
      const method = form.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: { message?: string } }).error?.message ?? 'Failed to save environment.');
        return;
      }
      resetForm();
      await load();
    } catch {
      setError('Failed to save environment.');
    } finally {
      setSaving(false);
    }
  }, [form, load, resetForm]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`Delete environment "${name}"?`)) return;
      setDeletingId(id);
      setError(null);
      try {
        const res = await fetch(serviceUrl(`environments/${id}`), { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError((json as { error?: { message?: string } }).error?.message ?? 'Failed to delete environment.');
          return;
        }
        if (form.id === id) resetForm();
        await load();
      } catch {
        setError('Failed to delete environment.');
      } finally {
        setDeletingId(null);
      }
    },
    [form.id, load, resetForm],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environments</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage remote environments for strategy deployment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Saved environments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Hostname</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Auth</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">Loading environments...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-sm text-gray-500">No environments created yet.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.apiHostname}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.hasAuthToken ? 'Configured' : 'Missing'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                id: item.id,
                                name: item.name,
                                apiHostname: item.apiHostname,
                                authToken: '',
                                isActive: item.isActive,
                              })
                            }
                            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={deletingId === item.id}
                            className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            {deletingId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit environment' : 'New environment'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Configure the API hostname and auth token used for remote strategy deploys.
              </p>
            </div>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">API hostname</span>
              <input
                type="text"
                value={form.apiHostname}
                onChange={(e) => setForm((prev) => ({ ...prev, apiHostname: e.target.value }))}
                placeholder="api.example.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Auth token {isEditing ? '(leave blank to keep current)' : ''}
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  type={showAuthToken ? 'text' : 'password'}
                  value={form.authToken}
                  onChange={(e) => setForm((prev) => ({ ...prev, authToken: e.target.value }))}
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
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Environment is active</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !form.name.trim() || !form.apiHostname.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-primary-400"
            >
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create environment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
