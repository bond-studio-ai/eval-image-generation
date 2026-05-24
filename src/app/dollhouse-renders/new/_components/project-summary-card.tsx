'use client';

import { ErrorCard } from '@/components/resource-form-header';
import { Badge, Checkbox, FormSection } from '@/components/ui';
import { cameraFrameKey, type DollhouseCameraFrame } from '@/lib/dollhouse-renders';
import type { ProjectRenderBootstrap } from '@/lib/projects';

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function ProjectSummaryCard({
  bootstrap,
  excludedFrameKeys,
  onToggleFrame,
}: {
  bootstrap: ProjectRenderBootstrap;
  excludedFrameKeys: ReadonlySet<string>;
  onToggleFrame: (key: string) => void;
}) {
  const includedCount = bootstrap.cameraFrames.length - excludedFrameKeys.size;

  const warnings: string[] = [];
  if (!bootstrap.designMaterials) {
    warnings.push('Project has no Unity-slim design materials. Cannot render.');
  }
  if (!bootstrap.roomData) {
    warnings.push('Project has no scan / room layout. Cannot render.');
  }
  if (bootstrap.cameraFrames.length === 0) {
    warnings.push('Project has no camera frames. Cannot render.');
  }

  return (
    <FormSection
      title={`Project ${bootstrap.project.id}`}
      description={
        bootstrap.project.name
          ? `${bootstrap.project.name} · ${bootstrap.project.appStatus}`
          : bootstrap.project.appStatus
      }
      actions={
        bootstrap.designMaterials ? (
          <Badge tone="info" variant="soft">
            Design {bootstrap.designMaterials.id.slice(0, 8)}
          </Badge>
        ) : null
      }
    >
      {warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {warnings.map((warning) => (
            <ErrorCard key={warning} message={warning} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Camera frames"
          value={`${includedCount} of ${bootstrap.cameraFrames.length}`}
        />
        <SummaryStat
          label="Design materials"
          value={bootstrap.designMaterials ? 'Loaded' : 'Missing'}
          tone={bootstrap.designMaterials ? 'success' : 'danger'}
        />
        <SummaryStat
          label="Room layout"
          value={bootstrap.roomData ? 'Loaded' : 'Missing'}
          tone={bootstrap.roomData ? 'success' : 'danger'}
        />
      </div>

      {bootstrap.cameraFrames.length > 0 && (
        <CameraFramesList
          frames={bootstrap.cameraFrames}
          excludedFrameKeys={excludedFrameKeys}
          onToggleFrame={onToggleFrame}
        />
      )}
    </FormSection>
  );
}

function CameraFramesList({
  frames,
  excludedFrameKeys,
  onToggleFrame,
}: {
  frames: DollhouseCameraFrame[];
  excludedFrameKeys: ReadonlySet<string>;
  onToggleFrame: (key: string) => void;
}) {
  return (
    <div className="mt-6">
      <p className={LABEL_CLASS}>Camera frames</p>
      <ul className="border-border-subtle divide-border-subtle mt-1 divide-y rounded-md border">
        {frames.map((frame, index) => {
          const key = cameraFrameKey(frame, index);
          const excluded = excludedFrameKeys.has(key);
          return (
            <li key={key} className="flex items-center gap-3 px-4 py-2">
              <Checkbox
                checked={!excluded}
                onChange={() => onToggleFrame(key)}
                label={
                  <span className="min-w-0">
                    <span className="text-body text-text-primary block truncate font-medium">
                      {frame.summary || `Frame ${index + 1}`}
                    </span>
                    <span className="text-caption text-text-muted block">
                      Priority {frame.priority} · aspect {frame.aspect.toFixed(2)} · fov{' '}
                      {frame.fov.toFixed(1)}
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

function SummaryStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-success-700'
      : tone === 'danger'
        ? 'text-danger-700'
        : 'text-text-primary';
  return (
    <div className="bg-surface-sunken rounded-md p-3">
      <p className="text-caption text-text-muted tracking-wide uppercase">{label}</p>
      <p className={`text-body mt-1 font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
