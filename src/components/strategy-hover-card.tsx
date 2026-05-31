"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ViewPromptModal } from "@/components/view-prompt-modal";
import { serviceUrl } from "@/lib/api-base";
import { STRATEGY_PROPERTY_COLORS } from "@/lib/strategy-property-colors";

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
  groupProductImages?: boolean;
  steps: {
    stepOrder: number;
    name: string | null;
    promptVersion?: { id: string; name: string | null } | null;
  }[];
}

const cache = new Map<string, StrategyData>();

export function StrategyHoverCard({ strategyId, children }: { strategyId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<StrategyData | null>(cache.get(strategyId) ?? null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [viewingPrompt, setViewingPrompt] = useState<{ id: string; name: string | null } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    if (cache.has(strategyId)) {
      setData(cache.get(strategyId)!);
      return;
    }
    try {
      const res = await fetch(serviceUrl(`strategies/${strategyId}`));
      if (!res.ok) return;
      const json = await res.json();
      const payload = json.data ?? json;
      cache.set(strategyId, payload);
      setData(payload);
    } catch {
      /* ignore */
    }
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
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  }, []);

  const keepOpen = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Clamp the card into the viewport once it mounts. Measuring needs the
  // rendered dimensions, so we do it in a callback ref (not an effect): the
  // ref re-fires whenever `pos` changes, and the clamp converges in one pass
  // because a second measure of the already-clamped position is a no-op.
  const measureCard = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !pos) return;
      const rect = node.getBoundingClientRect();
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
    },
    [pos]
  );

  return (
    <>
      <span ref={triggerRef} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} className="inline">
        {children}
      </span>
      {open &&
        pos &&
        createPortal(
          <div ref={measureCard} onMouseEnter={keepOpen} onMouseLeave={hide} className="border-border bg-surface fixed z-[9990] w-80 rounded-lg border p-4 shadow-xl" style={{ top: pos.top, left: pos.left }}>
            {data ? (
              <div className="space-y-3">
                <div>
                  <Link href={`/strategies/${data.id}`} className="text-primary-600 hover:text-primary-500 text-body font-semibold">
                    {data.name}
                  </Link>
                  {data.description && <p className="text-text-muted text-caption mt-0.5 line-clamp-2">{data.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge color="model">{data.model}</Badge>
                  <Badge color="aspectRatio">{data.aspectRatio}</Badge>
                  <Badge color="resolution">{data.outputResolution}</Badge>
                  {data.temperature && <Badge color="temperature">Temp {data.temperature}</Badge>}
                  {data.tagImages && <Badge color="tagImages">Tags</Badge>}
                  {data.useGoogleSearch && <Badge color="googleSearch">Search</Badge>}
                  {data.groupProductImages && <Badge color="tagImages">Grouped</Badge>}
                </div>
                {data.steps.length > 0 && (
                  <div>
                    <p className="text-text-disabled text-[10px] font-medium tracking-wider uppercase">Steps</p>
                    <ul className="mt-1 space-y-0.5">
                      {data.steps.map((step) => (
                        <li key={step.stepOrder} className="text-text-secondary text-caption">
                          <span className="text-text-secondary font-medium">{step.stepOrder}.</span> {step.name ?? "Untitled"}
                          {step.promptVersion && (
                            <>
                              <span className="text-text-disabled">: </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingPrompt({
                                    id: step.promptVersion!.id,
                                    name: step.promptVersion!.name
                                  });
                                }}
                                className="text-primary-600 hover:text-primary-500 hover:underline"
                              >
                                {step.promptVersion.name || "Untitled prompt"}
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-caption">Loading…</p>
            )}
          </div>,
          document.body
        )}
      {viewingPrompt && (
        <ViewPromptModal
          promptVersionId={viewingPrompt.id}
          promptVersionName={viewingPrompt.name}
          onClose={() => {
            setViewingPrompt(null);
          }}
        />
      )}
    </>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: keyof typeof STRATEGY_PROPERTY_COLORS }) {
  const colors = STRATEGY_PROPERTY_COLORS[color];
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>{children}</span>;
}
