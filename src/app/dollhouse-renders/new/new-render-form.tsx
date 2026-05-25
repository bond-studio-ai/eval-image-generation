'use client';

import { PageHeader } from '@/components/page-header';
import { ErrorCard } from '@/components/resource-form-header';
import { Button, Card, Spinner, Stepper, toast } from '@/components/ui';
import {
  cameraFrameKey,
  createDollhouseRender,
  DollhouseRenderApiError,
  DollhouseRenderUnexpectedResponseError,
  type DollhouseStyleOverride,
} from '@/lib/dollhouse-renders';
import { fetchProjectWithRenderBootstrap, type ProjectRenderBootstrap } from '@/lib/projects';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ProjectDataSection } from './_components/project-data-section';
import { ProjectPickerSection } from './_components/project-picker-section';
import { RenderConfigSection } from './_components/render-config-section';
import type { SsmParamsState } from './_components/ssm-params-editor';
import { useDollhouseOverrides } from './_components/use-dollhouse-overrides';
import { buildWizardModel, WIZARD_SECTION_IDS } from './_components/wizard-model';

export function NewRenderForm() {
  const router = useRouter();

  const [projectIdInput, setProjectIdInput] = useState('');
  const [bootstrap, setBootstrap] = useState<ProjectRenderBootstrap | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Per-frame include/exclude — keyed by `cameraFrameKey(frame, index)` so the
  // selection survives a (hypothetical) re-fetch that returns frames in a
  // different order. Reset whenever a new project is loaded.
  const [excludedFrameKeys, setExcludedFrameKeys] = useState<Set<string>>(new Set());

  const overrides = useDollhouseOverrides();

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

  // Destructure the stable `reset` callback so `clearProject` has a stable
  // identity across renders — without this the whole `overrides` object
  // dep would invalidate `clearProject` every render and force the picker
  // section to re-render unnecessarily.
  const { reset: resetOverrides } = overrides;
  const clearProject = useCallback(() => {
    loadAbortRef.current?.abort();
    setBootstrap(null);
    setProjectError(null);
    setExcludedFrameKeys(new Set());
    setProjectIdInput('');
    // Pasted overrides were almost certainly intended to apply *to the
    // project being changed away from*. Clear them too so the next
    // project's data shows through cleanly — otherwise users hit a
    // confusing "I picked a new project but it still says my override
    // is in effect" state.
    resetOverrides();
  }, [resetOverrides]);

  const toggleFrame = useCallback((key: string) => {
    setExcludedFrameKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // All derived state lives in `buildWizardModel`. This component just owns
  // the raw form inputs and routes them through one pure function.
  const model = useMemo(
    () =>
      buildWizardModel({
        bootstrap,
        projectError,
        designOverride: overrides.designResult,
        roomOverride: overrides.roomResult,
        excludedFrameKeys,
        imageConfig,
      }),
    [
      bootstrap,
      projectError,
      overrides.designResult,
      overrides.roomResult,
      excludedFrameKeys,
      imageConfig,
    ],
  );

  const scrollToStep = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Narrow the model into the three fields we actually need for submit.
  // Listing `model` as a whole dep would invalidate this callback on every
  // model-recompute (which happens on every keystroke in the image config),
  // even though `handleSubmit` only consults the resolved render inputs.
  const { effectiveDesignMaterials, effectiveRoomData, cameraFrames } = model;

  const handleSubmit = useCallback(async () => {
    if (!bootstrap || !effectiveDesignMaterials || !effectiveRoomData) return;
    setSubmitError(null);

    const filteredFrames = cameraFrames.filter(
      (frame, idx) => !excludedFrameKeys.has(cameraFrameKey(frame, idx)),
    );
    if (filteredFrames.length === 0) {
      setSubmitError('Select at least one camera frame to render.');
      return;
    }

    const body = buildCreateRenderBody({
      projectId: bootstrap.project.id,
      designMaterials: effectiveDesignMaterials,
      roomData: effectiveRoomData,
      cameraFrames: filteredFrames,
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
  }, [
    bootstrap,
    cameraFrames,
    effectiveDesignMaterials,
    effectiveRoomData,
    excludedFrameKeys,
    imageConfig,
    renderConfig,
    router,
    ssmParams,
    styleOverrides,
  ]);

  return (
    <div>
      <PageHeader
        backHref="/dollhouse-renders"
        backLabel="Back to Dollhouse Renders"
        title="New Dollhouse Render"
        subtitle="Step through the wizard: pick a project, review the project data, then configure the render."
      />

      <div className="bg-bg-app sticky top-0 z-10 -mx-4 mt-6 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <Stepper steps={model.steps} onStepClick={scrollToStep} label="Render wizard progress" />
      </div>

      <div className="mt-6 space-y-6">
        <section id={WIZARD_SECTION_IDS.project} className="scroll-mt-32">
          <ProjectPickerSection
            projectIdInput={projectIdInput}
            onProjectIdInputChange={setProjectIdInput}
            onLoadManualInput={handleManualLoad}
            onSelectFromTable={(id) => void loadProject(id)}
            loadingProject={loadingProject}
            projectError={projectError}
            selectedBootstrap={bootstrap}
            onClearProject={clearProject}
          />
        </section>

        {loadingProject && !bootstrap && (
          <Card className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-body text-text-secondary">Loading project data...</span>
          </Card>
        )}

        <section id={WIZARD_SECTION_IDS.data} className="scroll-mt-32">
          <ProjectDataSection
            bootstrap={bootstrap}
            excludedFrameKeys={excludedFrameKeys}
            onToggleFrame={toggleFrame}
            overrides={overrides}
            issues={model.dataIssues}
            onScrollToProjectStep={() => scrollToStep(WIZARD_SECTION_IDS.project)}
          />
        </section>

        <section id={WIZARD_SECTION_IDS.config} className="scroll-mt-32 space-y-6">
          <ImageConfigSection value={imageConfig} onChange={setImageConfig} />
          <RenderConfigSection value={renderConfig} onChange={setRenderConfig} />
        </section>

        <section id={WIZARD_SECTION_IDS.advanced} className="scroll-mt-32">
          <AdvancedSection
            styleOverrides={styleOverrides}
            onStyleOverridesChange={setStyleOverrides}
            ssmParams={ssmParams}
            onSsmParamsChange={setSsmParams}
          />
        </section>

        <section id={WIZARD_SECTION_IDS.create} className="scroll-mt-32">
          <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-h3 text-text-primary font-semibold">Ready to render</h2>
              <p className="text-body text-text-secondary mt-1">{model.summary}</p>
              {!model.canSubmit && model.allIssues.length > 0 && (
                <ul className="text-caption text-text-muted mt-2 list-inside list-disc">
                  {model.allIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!model.canSubmit || submitting}
              loading={submitting}
            >
              Create Render
            </Button>
          </Card>
          {submitError && (
            <div className="mt-4">
              <ErrorCard message={submitError} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
