'use client';

import { STRATEGY_PROPERTY_COLORS } from '@/lib/strategy-property-colors';
import { ViewPromptModal } from '@/components/view-prompt-modal';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface StrategyData {
  id: string;
  name: string;
  description: string | null;
  model: string;
  aspectRatio: string;
  outputResolution: string;
  temperature: string | null;
  useGoogleSearch: boolean;
  tagImages: boolean;
  steps: { stepOrder: number; name: string | null; promptVersion?: { id: string; name: string | null } | null }[];
}

const cache = new Map<string, StrategyData>();

export function StrategyHoverCard({
  strategyId,
  children,
}: {
  strategyId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<StrategyData | null>(cache.get(strategyId) ?? null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<{ id: string; name: string | null } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (cache.has(strategyId)) {
      setData(cache.get(strategyId)!);
      return;
    }
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}`);
      if (!res.ok) return;
      const json = await res.json();
      const d = json.data ?? json;
      cache.set(strategyId, d);
      setData(d);
    } catch { /* ignore */ }
  }, [strategyId]);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
      fetchData();
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 8, left: rect.left });
      }
    }, 300);
  }, [fetchData]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  const keepOpen = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  useEffect(() => {
    if (!open || !cardRef.current || !pos) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { top, left } = pos;
    if (left + rect.width > vw - 16) left = vw - rect.width - 16;
    if (left < 16) left = 16;
    if (top + rect.height > vh - 16) {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (triggerRect) top = triggerRect.top - rect.height - 8;
    }
    if (top !== pos.top || left !== pos.left) setPos({ top, left });
  }, [open, pos]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline"
      >
        {children}
      </span>
      {open && pos && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={keepOpen}
          onMouseLeave={hide}
          className="fixed z-[9990] w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {!data ? (
            <p className="text-xs text-gray-500">Loading…</p>
          ) : (
            <div className="space-y-3">
              <div>
                <Link
                  href={`/strategies/${data.id}`}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-500"
                >
                  {data.name}
                </Link>
                {data.description && (
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{data.description}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge color="model">{data.model}</Badge>
                <Badge color="aspectRatio">{data.aspectRatio}</Badge>
                <Badge color="resolution">{data.outputResolution}</Badge>
                {data.temperature && <Badge color="temperature">Temp {data.temperature}</Badge>}
                {data.tagImages && <Badge color="tagImages">Tags</Badge>}
                {data.useGoogleSearch && <Badge color="googleSearch">Search</Badge>}
              </div>
              {data.steps.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Steps</p>
                  <ul className="mt-1 space-y-0.5">
                    {data.steps.map((step) => (
                      <li key={step.stepOrder} className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">{step.stepOrder}.</span>{' '}
                        {step.name ?? 'Untitled'}
                        {step.promptVersion && (
                          <>
                            <span className="text-gray-400"> — </span>
                            <button
                              type="button"
                              onClick={() => setViewingPrompt({ id: step.promptVersion!.id, name: step.promptVersion!.name })}
                              className="text-primary-600 hover:text-primary-500 hover:underline"
                            >
                              {step.promptVersion.name || 'Untitled prompt'}
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
      {viewingPrompt && (
        <ViewPromptModal
          promptVersionId={viewingPrompt.id}
          promptVersionName={viewingPrompt.name}
          onClose={() => setViewingPrompt(null)}
        />
      )}
    </>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: keyof typeof STRATEGY_PROPERTY_COLORS }) {
  const c = STRATEGY_PROPERTY_COLORS[color];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>
      {children}
    </span>
  );
}
