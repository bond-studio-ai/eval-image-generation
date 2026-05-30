"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { serviceUrl } from "@/lib/api-base";

interface ViewPromptModalProps {
  promptVersionId: string;
  promptVersionName: string | null;
  processedSystemPrompt?: string | null;
  processedUserPrompt?: string | null;
  onClose: () => void;
}

export function ViewPromptModal({ promptVersionId, promptVersionName, processedSystemPrompt, processedUserPrompt, onClose }: ViewPromptModalProps) {
  const [data, setData] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(serviceUrl(`prompt-versions/${promptVersionId}`));
      if (!res.ok) {
        setError("Failed to load prompt");
        return;
      }
      const json = await res.json();
      const d = json.data ?? json;
      setData({
        systemPrompt: d.systemPrompt ?? "",
        userPrompt: d.userPrompt ?? ""
      });
    } catch {
      setError("Failed to load prompt");
    } finally {
      setLoading(false);
    }
  }, [promptVersionId]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-overlay/50 absolute inset-0" onClick={onClose} aria-hidden />
      <div className="border-border bg-surface relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border shadow-xl">
        <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3">
          <h2 className="text-text-primary text-h3">{promptVersionName || "Prompt"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-text-muted hover:bg-surface-sunken hover:text-text-secondary rounded p-1.5">
            <XIcon className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && <p className="text-text-muted text-body">Loading…</p>}
          {error && <p className="text-danger-600 text-body">{error}</p>}
          {data && (
            <div className="grid min-h-0 grid-cols-2 gap-5">
              <div className="flex flex-col">
                <h3 className="text-text-muted text-caption mb-2 font-semibold tracking-wider uppercase">System prompt{processedSystemPrompt ? " (processed)" : ""}</h3>
                <pre className="border-border bg-surface-muted text-text-secondary text-body flex-1 rounded-lg border p-4 leading-relaxed whitespace-pre-wrap">{processedSystemPrompt || data.systemPrompt || "(empty)"}</pre>
              </div>
              <div className="flex flex-col">
                <h3 className="text-text-muted text-caption mb-2 font-semibold tracking-wider uppercase">User prompt{processedUserPrompt ? " (processed)" : ""}</h3>
                <pre className="border-border bg-surface-muted text-text-secondary text-body flex-1 rounded-lg border p-4 leading-relaxed whitespace-pre-wrap">{processedUserPrompt || data.userPrompt || "(empty)"}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
