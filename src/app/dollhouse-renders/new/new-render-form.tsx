'use client';

import { PageHeader } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { Button, Card, Spinner, toast } from '@/components/ui';
import {
  cameraFrameKey,
  createDollhouseRender,
  DollhouseRenderApiError,
  DollhouseRenderUnexpectedResponseError,
  type DollhouseStyleOverride,
} from '@/lib/dollhouse-renders';
import { fetchProjectWithRenderBootstrap, type ProjectRenderBootstrap } from '@/lib/projects';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdvancedSection } from './_components/advanced-section';
import {
  buildCreateRenderBody,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_SSM_PARAMS,
  type ImageConfigState,
  type RenderConfigState,
} from './_components/build-request';
import { ImageConfigSection } from './_components/image-config-section';
import { ProjectPickerSection } from './_components/project-picker-section';
import { ProjectSummaryCard } from './_components/project-summary-card';
import { RenderConfigSection } from './_components/render-config-section';
import type { SsmParamsState } from './_components/ssm-params-editor';

export function NewRenderForm() {
  const router = useRouter();

  // Project picker state
  const [projectIdInput, setProjectIdInput] = useState('');
  const [bootstrap, setBootstrap] = useState<ProjectRenderBootstrap | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Per-frame include/exclude — keyed by `cameraFrameKey(frame, index)` so the
  // selection survives a (hypothetical) re-fetch that returns frames in a
  // different order. Reset whenever a new project is loaded.
  const [excludedFrameKeys, setExcludedFrameKeys] = useState<Set<string>>(new Set());

  // Form state
  const [imageConfig, setImageConfig] = useState<ImageConfigState>(DEFAULT_IMAGE_CONFIG);
  const [renderConfig, setRenderConfig] = useState<RenderConfigState>(DEFAULT_RENDER_CONFIG);
  const [ssmParams, setSsmParams] = useState<SsmParamsState>(DEFAULT_SSM_PARAMS);
  const [styleOverrides, setStyleOverrides] = useState<DollhouseStyleOverride[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tracks the in-flight bootstrap fetch so a fast second click cancels the
  // first — otherwise the slower response could land last and overwrite the
  // newer selection, making the form submit a render for the wrong project.
  const loadAbortRef = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      loadAbortRef.current?.abort();
    },
    [],
  );

  const loadProject = useCallback(async (projectId: string) => {
    const trimmed = projectId.trim();
    if (!trimmed) return;

    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setProjectIdInput(trimmed);
    setLoadingProject(true);
    setProjectError(null);
    setBootstrap(null);
    setExcludedFrameKeys(new Set());
    try {
      const result = await fetchProjectWithRenderBootstrap(trimmed, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setBootstrap(result);
    } catch (err) {
      // Aborts come through as either a DOMException with `name === 'AbortError'`
      // or a TypeError depending on runtime; check the controller as the source of truth.
      if (controller.signal.aborted) return;
      setProjectError(err instanceof Error ? err.message : 'Failed to fetch project');
    } finally {
      if (loadAbortRef.current === controller) {
        loadAbortRef.current = null;
        setLoadingProject(false);
      }
    }
  }, []);

  const handleManualLoad = useCallback(() => {
    void loadProject(projectIdInput);
  }, [loadProject, projectIdInput]);

  const toggleFrame = useCallback((key: string) => {
    setExcludedFrameKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const canSubmit =
    !!bootstrap &&
    !!bootstrap.designMaterials &&
    !!bootstrap.roomData &&
    bootstrap.cameraFrames.length > 0 &&
    excludedFrameKeys.size < bootstrap.cameraFrames.length;

  const handleSubmit = useCallback(async () => {
    if (!bootstrap || !bootstrap.designMaterials || !bootstrap.roomData) return;
    setSubmitError(null);

    const cameraFrames = bootstrap.cameraFrames.filter(
      (frame, idx) => !excludedFrameKeys.has(cameraFrameKey(frame, idx)),
    );
    if (cameraFrames.length === 0) {
      setSubmitError('Select at least one camera frame to render.');
      return;
    }

    const body = buildCreateRenderBody({
      projectId: bootstrap.project.id,
      designMaterials: bootstrap.designMaterials,
      roomData: bootstrap.roomData,
      cameraFrames,
      imageConfig,
      renderConfig,
      ssmParams,
      styleOverrides,
    });

    setSubmitting(true);
    try {
      const created = await createDollhouseRender(body);
      toast.success(`Render ${created.id.slice(0, 8)} created.`);
      router.push(`/dollhouse-renders/${created.id}`);
    } catch (err) {
      const message =
        err instanceof DollhouseRenderApiError
          ? err.message
          : err instanceof DollhouseRenderUnexpectedResponseError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to create render';
      setSubmitError(message);
      setSubmitting(false);
    }
  }, [bootstrap, excludedFrameKeys, imageConfig, renderConfig, router, ssmParams, styleOverrides]);

  return (
    <div>
      <PageHeader
        backHref="/dollhouse-renders"
        backLabel="Back to Dollhouse Renders"
        title="New Dollhouse Render"
        subtitle="Pick a project and configure the render. Project data populates the camera frames, design materials, and room layout."
        actions={
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} loading={submitting}>
            Create Render
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        <ProjectPickerSection
          projectIdInput={projectIdInput}
          onProjectIdInputChange={setProjectIdInput}
          onLoadManualInput={handleManualLoad}
          onSelectFromTable={(id) => void loadProject(id)}
          loadingProject={loadingProject}
          projectError={projectError}
          selectedProjectId={bootstrap?.project.id ?? null}
        />

        {loadingProject && !bootstrap && (
          <Card className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-body text-text-secondary">Loading project data...</span>
          </Card>
        )}

        {bootstrap && (
          <>
            <ProjectSummaryCard
              bootstrap={bootstrap}
              excludedFrameKeys={excludedFrameKeys}
              onToggleFrame={toggleFrame}
            />
            <ImageConfigSection value={imageConfig} onChange={setImageConfig} />
            <RenderConfigSection value={renderConfig} onChange={setRenderConfig} />
            <AdvancedSection
              styleOverrides={styleOverrides}
              onStyleOverridesChange={setStyleOverrides}
              ssmParams={ssmParams}
              onSsmParamsChange={setSsmParams}
            />
            {submitError && <ErrorCard message={submitError} />}
          </>
        )}
      </div>
    </div>
  );
}
