'use client';

import { Button, cn, IconButton, RocketIcon, toast } from '@/components/ui';
import { serviceUrl } from '@/lib/api-base';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type EnvironmentItem = {
  id: string;
  name: string;
  apiHostname: string;
  isActive: boolean;
  hasAuthToken: boolean;
};

export function DeployToEnvironmentButton({
  strategyId,
  label = 'Deploy',
  variant = 'secondary',
}: {
  strategyId: string;
  label?: string;
  variant?: 'secondary' | 'icon';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSelectedId('');
    setError(null);
    setResult(null);
    fetch(serviceUrl('environments?limit=100'), { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (json as { error?: { message?: string } }).error?.message ??
              'Failed to load environments.',
          );
        }
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const items = Array.isArray(json.data) ? (json.data as EnvironmentItem[]) : [];
        setEnvironments(items);
        const firstEligible = items.find((item) => item.isActive && item.hasAuthToken);
        setSelectedId(firstEligible?.id ?? '');
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setEnvironments([]);
          setError(err instanceof Error ? err.message : 'Failed to load environments.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleDeploy = useCallback(async () => {
    if (!selectedId) return;
    setDeploying(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(serviceUrl(`environments/${selectedId}/deploy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'strategy',
          mode: 'upsert',
          data: { id: strategyId },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          (json as { error?: { message?: string } }).error?.message ?? 'Deploy failed.';
        setError(message);
        toast.error('Deploy failed', { description: message });
        return;
      }
      const deployResult = (json as { data?: { result?: string; environment?: { name?: string } } })
        .data;
      const message = `${deployResult?.result === 'updated' ? 'Updated' : 'Created'} in ${
        deployResult?.environment?.name ?? 'environment'
      }.`;
      setResult(message);
      toast.success('Strategy deployed', { description: message });
      router.refresh();
    } catch {
      setError('Deploy failed.');
      toast.error('Deploy failed');
    } finally {
      setDeploying(false);
    }
  }, [router, selectedId, strategyId]);

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          label={label}
          icon={<RocketIcon className="h-4 w-4" />}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          iconLeft={<RocketIcon className="h-4 w-4" />}
        >
          {label}
        </Button>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="rounded-card border-border bg-surface shadow-modal w-full max-w-lg border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-border-subtle border-b px-5 py-4">
                <h3 className="text-h3 text-text-primary font-semibold">Deploy Strategy</h3>
                <p className="text-body text-text-secondary mt-1">
                  Choose an environment to deploy this strategy to.
                </p>
              </div>

              <div className="space-y-3 px-5 py-4">
                {loading ? (
                  <p className="text-body text-text-muted">Loading environments...</p>
                ) : environments.length === 0 ? (
                  <p className="text-body text-text-muted">No environments available.</p>
                ) : (
                  <div className="space-y-2">
                    {environments.map((environment) => {
                      const disabled = !environment.isActive || !environment.hasAuthToken;
                      const checked = selectedId === environment.id;
                      return (
                        <label
                          key={environment.id}
                          className={cn(
                            'rounded-card flex cursor-pointer items-start gap-3 border px-4 py-3 transition-colors',
                            checked
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-border bg-surface hover:bg-surface-muted',
                            disabled && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <input
                            type="radio"
                            name="environmentId"
                            value={environment.id}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setSelectedId(environment.id)}
                            className="text-primary-600 focus:ring-primary-500 mt-0.5 h-4 w-4"
                          />
                          <div className="min-w-0">
                            <p className="text-body text-text-primary font-medium">
                              {environment.name}
                            </p>
                            <p className="text-caption text-text-muted">
                              {environment.apiHostname}
                            </p>
                            <p className="text-caption text-text-muted mt-1">
                              {!environment.isActive
                                ? 'Inactive'
                                : !environment.hasAuthToken
                                  ? 'Missing auth token'
                                  : 'Ready to deploy'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {error && <p className="text-body text-danger-600">{error}</p>}
                {result && <p className="text-body text-success-600">{result}</p>}
              </div>

              <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-3">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button onClick={handleDeploy} disabled={!selectedId} loading={deploying}>
                  {deploying ? 'Deploying...' : 'Deploy'}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
