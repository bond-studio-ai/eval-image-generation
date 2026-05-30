import { DateTimeCell } from '@/components/date-cells';
import { ExpandableImage } from '@/components/expandable-image';
import { PageHeader } from '@/components/page-header';
import { RenderStatusBadge } from '@/components/render-status-badge';
import { Card, Spinner } from '@/components/ui';
import { getDollhouseRender, type DollhouseRender } from '@/lib/dollhouse-renders';
import { imageGenerationV2Base } from '@/lib/env';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RenderAutoRefresh } from './render-auto-refresh';

export const metadata: Metadata = {
  title: 'Dollhouse Render',
  description: 'Dollhouse render details and frames.',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server-side fetch through the canonical client helper with an explicit
 * `baseUrl` so we skip the Next request layer. Errors propagate to the error
 * boundary instead of getting silently swallowed into a misleading 404.
 */
async function fetchRender(id: string): Promise<DollhouseRender | null> {
  return getDollhouseRender(id, {
    includeFrames: true,
    baseUrl: imageGenerationV2Base(),
  });
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3">
      <dt className="text-caption text-text-secondary font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-body text-text-primary">{children}</dd>
    </div>
  );
}

export default async function DollhouseRenderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const render = await fetchRender(id);
  if (!render) notFound();

  const frames = render.frames ?? [];

  const imageConfigSummary = `${render.imageConfig.width}×${render.imageConfig.height} ${render.imageConfig.format}${
    render.imageConfig.superSamplingMultiplier
      ? ` (SSM ×${render.imageConfig.superSamplingMultiplier})`
      : ''
  }`;

  const renderConfigEntries: { label: string; value: React.ReactNode }[] = [];
  if (render.renderConfig?.renderMode) {
    renderConfigEntries.push({ label: 'Render mode', value: render.renderConfig.renderMode });
  }
  if (typeof render.renderConfig?.advancedSegmentation === 'boolean') {
    renderConfigEntries.push({
      label: 'Advanced segmentation',
      value: render.renderConfig.advancedSegmentation ? 'On' : 'Off',
    });
  }
  if (typeof render.renderConfig?.overrideCameraHeight === 'number') {
    renderConfigEntries.push({
      label: 'Override camera height',
      value: render.renderConfig.overrideCameraHeight,
    });
  }

  return (
    <div>
      <PageHeader
        backHref="/dollhouse-renders"
        backLabel="Back to Dollhouse Renders"
        title={`Render ${render.id.slice(0, 8)}`}
        subtitle={
          <span>
            Project <span className="text-text-primary font-medium">{render.projectId}</span>
          </span>
        }
        actions={<RenderStatusBadge status={render.status} />}
      />
      <RenderAutoRefresh status={render.status} />

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-h3 text-text-primary font-semibold">Configuration</h2>
          <dl className="mt-4 space-y-3">
            <MetaRow label="Render ID">
              <code className="text-caption font-mono">{render.id}</code>
            </MetaRow>
            <MetaRow label="Project ID">{render.projectId}</MetaRow>
            <MetaRow label="Image">{imageConfigSummary}</MetaRow>
            {renderConfigEntries.map((entry) => (
              <MetaRow key={entry.label} label={entry.label}>
                {entry.value}
              </MetaRow>
            ))}
            {render.errorMessage && (
              <MetaRow label="Error">
                <span className="text-danger-700">{render.errorMessage}</span>
              </MetaRow>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="text-h3 text-text-primary font-semibold">Timeline</h2>
          <dl className="mt-4 space-y-3">
            <MetaRow label="Created">
              <DateTimeCell date={render.createdAt} />
            </MetaRow>
            <MetaRow label="Posted">
              <DateTimeCell date={render.postedAt} />
            </MetaRow>
            <MetaRow label="Completed">
              <DateTimeCell date={render.completedAt} />
            </MetaRow>
            <MetaRow label="Failed">
              <DateTimeCell date={render.failedAt} />
            </MetaRow>
            <MetaRow label="Updated">
              <DateTimeCell date={render.updatedAt} />
            </MetaRow>
          </dl>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-h2 text-text-primary font-semibold">Frames</h2>
          <span className="text-caption text-text-muted">
            {frames.length} frame{frames.length === 1 ? '' : 's'}
          </span>
        </div>
        {frames.length === 0 ? (
          <Card className="mt-4">
            {render.status === 'pending' || render.status === 'posted' ? (
              <div className="flex items-center gap-3">
                <Spinner size="sm" />
                <p className="text-body text-text-secondary">
                  This render is still processing. The page refreshes automatically and frames will
                  appear here once the callback completes.
                </p>
              </div>
            ) : (
              <p className="text-body text-text-secondary">
                No frames are available for this render.
              </p>
            )}
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frames
              .slice()
              .sort((a, b) => a.priority - b.priority || a.frameIndex - b.frameIndex)
              .map((frame) => (
                <Card key={frame.id} padding="none" className="overflow-hidden">
                  <div className="bg-surface-sunken">
                    <ExpandableImage
                      src={frame.prettyUrl || frame.imageUrl}
                      alt={frame.summary || `Frame ${frame.frameIndex + 1}`}
                      wrapperClassName="relative block aspect-[4/3] w-full"
                    />
                  </div>
                  <div className="border-border-subtle border-t px-4 py-3">
                    <p className="text-body text-text-primary truncate font-medium">
                      {frame.summary || `Frame ${frame.frameIndex + 1}`}
                    </p>
                    <p className="text-caption text-text-muted mt-0.5">
                      Priority {frame.priority} · Index {frame.frameIndex}
                    </p>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
