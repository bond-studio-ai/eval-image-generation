"use client";

import { useState } from "react";
import { ErrorCard } from "@/components/resource-form-header";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { FormSection } from "@/components/ui/form-section";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons";
import { cameraFrameKey, type DollhouseCameraFrame } from "@/lib/dollhouse-renders";
import type { ProjectRenderBootstrap } from "@/lib/projects";
import type { DollhouseOverridesController } from "./use-dollhouse-overrides";

const LABEL_CLASS = "text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide";

interface ProjectDataSectionProps {
  bootstrap: ProjectRenderBootstrap | null;
  excludedFrameKeys: ReadonlySet<string>;
  onToggleFrame: (key: string) => void;
  overrides: DollhouseOverridesController;
  issues: string[];
  onScrollToProjectStep: () => void;
}

export function ProjectDataSection({ bootstrap, excludedFrameKeys, onToggleFrame, overrides, issues, onScrollToProjectStep }: ProjectDataSectionProps) {
  const includedCount = bootstrap ? bootstrap.cameraFrames.length - excludedFrameKeys.size : 0;

  return (
    <FormSection title="Project data" description="Review the project's camera frames and override design materials or room data if needed.">
      {bootstrap ? (
        <div className="space-y-6">
          <SummaryGrid bootstrap={bootstrap} includedCount={includedCount} />

          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue) => (
                <ErrorCard key={issue} message={issue} />
              ))}
            </div>
          )}

          {bootstrap.cameraFrames.length > 0 && <CameraFramesList frames={bootstrap.cameraFrames} excludedFrameKeys={excludedFrameKeys} onToggleFrame={onToggleFrame} />}
        </div>
      ) : (
        <EmptyState onPickProject={onScrollToProjectStep} />
      )}

      <OverridePanel overrides={overrides} hasBootstrap={Boolean(bootstrap)} />
    </FormSection>
  );
}

function EmptyState({ onPickProject }: { onPickProject: () => void }) {
  return (
    <Banner
      tone="neutral"
      title="No project loaded yet"
      description="Camera frames come from the project. Load one in step 1 to populate the wizard."
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={onPickProject}>
          Go to project picker
        </Button>
      }
    />
  );
}

function SummaryGrid({ bootstrap, includedCount }: { bootstrap: ProjectRenderBootstrap; includedCount: number }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-body text-text-primary font-semibold">Project {bootstrap.project.id}</h3>
          {(bootstrap.project.name || bootstrap.project.appStatus) && <p className="text-caption text-text-muted mt-0.5 truncate">{[bootstrap.project.name, bootstrap.project.appStatus].filter(Boolean).join(" · ")}</p>}
        </div>
        {bootstrap.designMaterials && (
          <Badge tone="info" variant="soft">
            Design {bootstrap.designMaterials.id.slice(0, 8)}
          </Badge>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat label="Camera frames" value={`${includedCount} of ${bootstrap.cameraFrames.length}`} />
        <SummaryStat label="Design materials" value={bootstrap.designMaterials ? "Loaded" : "Missing"} tone={bootstrap.designMaterials ? "success" : "danger"} />
        <SummaryStat label="Room layout" value={bootstrap.roomData ? "Loaded" : "Missing"} tone={bootstrap.roomData ? "success" : "danger"} />
      </div>
    </div>
  );
}

function CameraFramesList({ frames, excludedFrameKeys, onToggleFrame }: { frames: DollhouseCameraFrame[]; excludedFrameKeys: ReadonlySet<string>; onToggleFrame: (key: string) => void }) {
  return (
    <div>
      <p className={LABEL_CLASS}>Camera frames</p>
      <ul className="border-border-subtle divide-border-subtle mt-1 divide-y rounded-md border">
        {frames.map((frame, index) => {
          const key = cameraFrameKey(frame, index);
          const excluded = excludedFrameKeys.has(key);
          return (
            <li key={key} className="flex items-center gap-3 px-4 py-2">
              <Checkbox
                checked={!excluded}
                onChange={() => {
                  onToggleFrame(key);
                }}
                label={
                  <span className="min-w-0">
                    <span className="text-body text-text-primary block truncate font-medium">{frame.summary || `Frame ${index + 1}`}</span>
                    <span className="text-caption text-text-muted block">
                      Priority {frame.priority} · aspect {frame.aspect.toFixed(2)} · fov {frame.fov.toFixed(1)}
                    </span>
                  </span>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OverridePanel({ overrides, hasBootstrap }: { overrides: DollhouseOverridesController; hasBootstrap: boolean }) {
  const { designMaterialsInput, setDesignMaterialsInput, roomDataInput, setRoomDataInput, designResult, roomResult, hasContent } = overrides;

  // Auto-expand when there's content. Wrapped in state so the user can still
  // toggle it closed manually, but a fresh paste or a project load that
  // arrives with errors will pop the panel back open.
  const [forcedOpen, setForcedOpen] = useState<boolean | null>(null);
  const isOpen = forcedOpen ?? hasContent;

  const summary = (() => {
    const bits = [designResult.provided ? "design materials" : null, roomResult.provided ? "room data" : null].filter(Boolean);
    if (bits.length === 0) return "Paste JSON to override what was loaded from the project.";
    return `Currently overriding ${bits.join(" & ")}.`;
  })();

  return (
    <div className="border-border-subtle mt-6 border-t pt-6">
      <button
        type="button"
        onClick={() => {
          setForcedOpen(!isOpen);
        }}
        className="hover:bg-surface-muted -mx-2 flex w-[calc(100%+1rem)] items-center justify-between rounded-md px-2 py-1 text-left transition-colors"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <h3 className="text-body text-text-primary font-semibold">Override project data (optional)</h3>
          <p className="text-caption text-text-muted mt-0.5">{summary}</p>
        </div>
        {isOpen ? <ChevronUpIcon className="text-text-muted size-4" aria-hidden /> : <ChevronDownIcon className="text-text-muted size-4" aria-hidden />}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-5">
          <Field label="Design materials (Unity-slim JSON)" optional hint={hasBootstrap && !designResult.provided ? "Empty — using the value loaded from the project." : undefined} error={designResult.error ?? undefined}>
            {(id) => (
              <Textarea
                id={id}
                value={designMaterialsInput}
                onChange={(e) => {
                  setDesignMaterialsInput(e.target.value);
                }}
                placeholder='{"id":"...","objects":{},"surfaces":{}}'
                rows={6}
                spellCheck={false}
                className="font-mono text-[13px]"
              />
            )}
          </Field>
          <Field label="Room data (JSON)" optional hint={hasBootstrap && !roomResult.provided ? "Empty — using the value loaded from the project." : undefined} error={roomResult.error ?? undefined}>
            {(id) => (
              <Textarea
                id={id}
                value={roomDataInput}
                onChange={(e) => {
                  setRoomDataInput(e.target.value);
                }}
                placeholder='{"roomId":"...","walls":[],"floor":{}}'
                rows={6}
                spellCheck={false}
                className="font-mono text-[13px]"
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

const SUMMARY_STAT_VALUE_CLASS: Record<"neutral" | "success" | "danger", string> = {
  success: "text-success-700",
  danger: "text-danger-700",
  neutral: "text-text-primary"
};

function SummaryStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  const valueClass = SUMMARY_STAT_VALUE_CLASS[tone];
  return (
    <div className="bg-surface-sunken rounded-md p-3">
      <p className="text-caption text-text-muted tracking-wide uppercase">{label}</p>
      <p className={`text-body mt-1 font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
