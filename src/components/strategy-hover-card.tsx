"use client";

import * as HoverCard from "@radix-ui/react-hover-card";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ViewPromptModal } from "@/components/view-prompt-modal";
import { serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { dataEnvelope, strategyHoverSchema } from "@/lib/api/schemas";
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
  const [data, setData] = useState<StrategyData | null>(cache.get(strategyId) ?? null);
  const [viewingPrompt, setViewingPrompt] = useState<{ id: string; name: string | null } | null>(null);

  const fetchData = useCallback(async () => {
    if (cache.has(strategyId)) {
      setData(cache.get(strategyId)!);
      return;
    }
    try {
      const json = await fetchJson(serviceUrl(`strategies/${strategyId}`), dataEnvelope(strategyHoverSchema));
      cache.set(strategyId, json.data);
      setData(json.data);
    } catch {
      /* ignore */
    }
  }, [strategyId]);

  return (
    <>
      <HoverCard.Root
        openDelay={300}
        closeDelay={200}
        onOpenChange={(open) => {
          if (open) void fetchData();
        }}
      >
        <HoverCard.Trigger asChild>
          <span className="inline">{children}</span>
        </HoverCard.Trigger>
        <HoverCard.Portal>
          {/* Radix handles viewport collision (flip/shift) — no manual clamping. */}
          <HoverCard.Content side="bottom" align="start" sideOffset={8} collisionPadding={16} className="border-border bg-surface z-[9990] w-80 rounded-lg border p-4 shadow-xl">
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
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
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
