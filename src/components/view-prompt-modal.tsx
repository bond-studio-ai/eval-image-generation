'use client';

import { imageGenerationApiUrl } from '@/lib/api-base';
import { useCallback, useEffect, useState } from 'react';

interface ViewPromptModalProps {
  promptVersionId: string;
  promptVersionName: string | null;
  processedUserPrompt?: string | null;
  onClose: () => void;
}

export function ViewPromptModal({ promptVersionId, promptVersionName, processedUserPrompt, onClose }: ViewPromptModalProps) {
  const [data, setData] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(imageGenerationApiUrl(`prompt-versions/${promptVersionId}`));
      if (!res.ok) {
        setError('Failed to load prompt');
        return;
      }
      const json = await res.json();
      const d = json.data ?? json;
      setData({
        systemPrompt: d.systemPrompt ?? '',
        userPrompt: d.userPrompt ?? '',
      });
    } catch {
      setError('Failed to load prompt');
    } finally {
      setLoading(false);
    }
  }, [promptVersionId]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {promptVersionName || 'Prompt'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data && (
            <div className="grid min-h-0 grid-cols-2 gap-5">
              <div className="flex flex-col">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">System prompt</h3>
                <pre className="flex-1 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
                  {data.systemPrompt || '(empty)'}
                </pre>
              </div>
              <div className="flex flex-col">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  User prompt{processedUserPrompt ? ' (processed)' : ''}
                </h3>
                <pre className="flex-1 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
                  {(processedUserPrompt || data.userPrompt) || '(empty)'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
