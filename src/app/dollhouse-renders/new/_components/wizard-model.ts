import type { StepperStep, StepperStepState } from "@/components/ui/stepper";
import { cameraFrameKey, type DollhouseCameraFrame, type UnitySlimDesignMaterials } from "@/lib/dollhouse-renders";
import type { ProjectRenderBootstrap } from "@/lib/projects";
import type { ImageConfigState, OverrideParseResult } from "./build-request";

/**
 * Scroll-anchor ids for every section on the new-render form. The three
 * gating steps (`project`, `data`, `config`) double as stepper entries;
 * `advanced` is optional and `create` is the footer destination. Both
 * sets share the same string namespace so the stepper's smooth-scroll
 * can target any anchor without a second lookup table.
 */
export const WIZARD_SECTION_IDS = {
  project: "step-project",
  data: "step-project-data",
  config: "step-config",
  advanced: "step-advanced",
  create: "step-create"
} as const;

/**
 * The three gating steps in display order — the one place to add a new step.
 * The stepper and cascade build their entries from these keys.
 */
export type WizardStepKey = "project" | "data" | "config";

export interface WizardInput {
  bootstrap: ProjectRenderBootstrap | null;
  projectError: string | null;
  designOverride: OverrideParseResult<UnitySlimDesignMaterials>;
  roomOverride: OverrideParseResult<Record<string, unknown>>;
  excludedFrameKeys: ReadonlySet<string>;
  imageConfig: ImageConfigState;
}

export interface WizardModel {
  effectiveDesignMaterials: UnitySlimDesignMaterials | null;
  effectiveRoomData: Record<string, unknown> | null;
  cameraFrames: DollhouseCameraFrame[];
  includedFrameCount: number;
  imageWidth: number;
  imageHeight: number;
  imageConfigValid: boolean;
  projectDataReady: boolean;
  canSubmit: boolean;
  /** Issues attached to step 1 (Project). */
  projectIssues: string[];
  /** Issues attached to step 2 (Project data). */
  dataIssues: string[];
  /** Issues attached to step 3 (Image & render). */
  configIssues: string[];
  /** Flattened list of every blocker, in step order, for the footer summary. */
  allIssues: string[];
  summary: string;
  steps: StepperStep[];
}

/**
 * Pure projection from the form's raw state to everything the UI needs
 * to render (step states, per-step issue lists, submit-readiness, the
 * summary line). Keeping this side-effect free lets `new-render-form.tsx`
 * stay declarative and lets us unit-test the wizard's state machine
 * without React.
 */
export function buildWizardModel(input: WizardInput): WizardModel {
  const effectiveDesignMaterials = input.designOverride.provided ? input.designOverride.value : (input.bootstrap?.designMaterials ?? null);
  const effectiveRoomData = input.roomOverride.provided ? input.roomOverride.value : (input.bootstrap?.roomData ?? null);
  const cameraFrames = input.bootstrap?.cameraFrames ?? [];

  const includedFrameCount = cameraFrames.filter((frame, idx) => !input.excludedFrameKeys.has(cameraFrameKey(frame, idx))).length;

  const imageWidth = Number.parseInt(input.imageConfig.width, 10);
  const imageHeight = Number.parseInt(input.imageConfig.height, 10);
  const imageConfigValid = Number.isFinite(imageWidth) && imageWidth > 0 && Number.isFinite(imageHeight) && imageHeight > 0;

  const overrideErrors = !!input.designOverride.error || !!input.roomOverride.error;

  const projectDataReady = !!effectiveDesignMaterials && !!effectiveRoomData && cameraFrames.length > 0 && includedFrameCount > 0 && !overrideErrors;

  // Camera frames have to come from a project — that's the user-stated
  // constraint. So `canSubmit` requires a bootstrap even if both override
  // textareas are filled.
  const canSubmit = !!input.bootstrap && projectDataReady && imageConfigValid && !overrideErrors;

  const projectIssues = collectProjectIssues(input);
  const dataIssues = collectDataIssues({
    bootstrap: input.bootstrap,
    designOverride: input.designOverride,
    roomOverride: input.roomOverride,
    effectiveDesignMaterials,
    effectiveRoomData,
    cameraFrames,
    includedFrameCount
  });
  const configIssues = collectConfigIssues({ imageConfigValid });
  const allIssues = [...projectIssues, ...dataIssues, ...configIssues];

  const stepStates = computeStepStates({
    projectError: input.projectError,
    bootstrapLoaded: !!input.bootstrap,
    overrideErrors,
    projectDataReady,
    imageConfigValid
  });

  const steps: StepperStep[] = [
    {
      id: WIZARD_SECTION_IDS.project,
      label: "Project",
      description: input.bootstrap ? input.bootstrap.project.id : "Pick or paste an ID",
      state: stepStates.project
    },
    {
      id: WIZARD_SECTION_IDS.data,
      label: "Project data",
      description: input.bootstrap ? `${includedFrameCount}/${cameraFrames.length} frames` : "Frames & overrides",
      state: stepStates.data
    },
    {
      id: WIZARD_SECTION_IDS.config,
      label: "Image & render",
      description: `${input.imageConfig.width || "?"}×${input.imageConfig.height || "?"} ${input.imageConfig.format}`,
      state: stepStates.config
    }
  ];

  const summary = canSubmit
    ? `Submit ${includedFrameCount} frame${includedFrameCount === 1 ? "" : "s"} for project ${input.bootstrap?.project.id} at ${imageWidth}×${imageHeight} ${input.imageConfig.format}.`
    : "Complete the steps above to enable Create Render.";

  return {
    effectiveDesignMaterials,
    effectiveRoomData,
    cameraFrames,
    includedFrameCount,
    imageWidth,
    imageHeight,
    imageConfigValid,
    projectDataReady,
    canSubmit,
    projectIssues,
    dataIssues,
    configIssues,
    allIssues,
    summary,
    steps
  };
}

/**
 * Resolve each step's display state in cascade order. The user contract:
 *
 * - The first non-satisfied step is the cursor (`'current'`, or `'error'`
 *   if the failure is structural like a project-fetch error).
 * - Every step *after* the cursor is `'pending'`, regardless of its own
 *   raw status. This is deliberate: we hide downstream errors while an
 *   upstream gate is still open so users finish the current step before
 *   we surface a deeper one.
 * - A step is only `'complete'` after every step before it is also
 *   `'complete'`.
 *
 * For three steps a manual ladder is much easier to read than the
 * generic walker we tried first; if a fourth gating step ever appears,
 * promote this back to the data-driven loop.
 */
function computeStepStates({
  projectError,
  bootstrapLoaded,
  overrideErrors,
  projectDataReady,
  imageConfigValid
}: {
  projectError: string | null;
  bootstrapLoaded: boolean;
  overrideErrors: boolean;
  projectDataReady: boolean;
  imageConfigValid: boolean;
}): Record<WizardStepKey, StepperStepState> {
  // Step 1: Project
  if (projectError) {
    return { project: "error", data: "pending", config: "pending" };
  }
  if (!bootstrapLoaded) {
    return { project: "current", data: "pending", config: "pending" };
  }

  // Step 2: Project data
  if (overrideErrors) {
    return { project: "complete", data: "error", config: "pending" };
  }
  if (!projectDataReady) {
    return { project: "complete", data: "current", config: "pending" };
  }

  // Step 3: Image & render
  if (!imageConfigValid) {
    return { project: "complete", data: "complete", config: "current" };
  }
  return { project: "complete", data: "complete", config: "complete" };
}

function collectProjectIssues(input: WizardInput): string[] {
  const issues: string[] = [];
  if (!input.bootstrap) {
    issues.push("Load a project in step 1 to populate camera frames.");
  }
  return issues;
}

interface DataIssueInput {
  bootstrap: ProjectRenderBootstrap | null;
  designOverride: OverrideParseResult<UnitySlimDesignMaterials>;
  roomOverride: OverrideParseResult<Record<string, unknown>>;
  effectiveDesignMaterials: UnitySlimDesignMaterials | null;
  effectiveRoomData: Record<string, unknown> | null;
  cameraFrames: DollhouseCameraFrame[];
  includedFrameCount: number;
}

function collectDataIssues(input: DataIssueInput): string[] {
  const issues: string[] = [];
  if (input.designOverride.error) {
    issues.push(`Design materials: ${input.designOverride.error}`);
  }
  if (input.roomOverride.error) {
    issues.push(`Room data: ${input.roomOverride.error}`);
  }
  if (input.bootstrap && !input.effectiveDesignMaterials) {
    issues.push("Design materials are missing for this project.");
  }
  if (input.bootstrap && !input.effectiveRoomData) {
    issues.push("Room layout is missing for this project.");
  }
  if (input.bootstrap && input.cameraFrames.length === 0) {
    issues.push("This project has no camera frames.");
  }
  if (input.cameraFrames.length > 0 && input.includedFrameCount === 0) {
    issues.push("Select at least one camera frame to render.");
  }
  return issues;
}

function collectConfigIssues({ imageConfigValid }: { imageConfigValid: boolean }): string[] {
  return imageConfigValid ? [] : ["Set positive width and height in the image config."];
}
