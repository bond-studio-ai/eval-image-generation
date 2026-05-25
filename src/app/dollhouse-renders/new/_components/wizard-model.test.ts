import {
  cameraFrameKey,
  type DollhouseCameraFrame,
  type UnitySlimDesignMaterials,
} from '@/lib/dollhouse-renders';
import type { ProjectRenderBootstrap } from '@/lib/projects';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_IMAGE_CONFIG,
  type ImageConfigState,
  type OverrideParseResult,
} from './build-request';
import { buildWizardModel, type WizardInput } from './wizard-model';

const DESIGN: UnitySlimDesignMaterials = {
  id: 'design-1',
  objects: {},
  surfaces: {},
};

const FRAME: DollhouseCameraFrame = {
  aspect: 1.333,
  fov: 60,
  position: { x: 0, y: 0, z: 0 },
  priority: 1,
  products: [],
  rotation: { x: 0, y: 0, z: 0 },
  summary: 'Frame 1',
};

const ROOM_DATA: Record<string, unknown> = { foo: 'bar' };

function bootstrap(overrides: Partial<ProjectRenderBootstrap> = {}): ProjectRenderBootstrap {
  return {
    project: { id: 'PRJ-1', name: 'Test', appStatus: 'DesignsReady' },
    designMaterials: DESIGN,
    roomData: ROOM_DATA,
    cameraFrames: [FRAME],
    ...overrides,
  };
}

const EMPTY_OVERRIDE: OverrideParseResult<UnitySlimDesignMaterials> = {
  provided: false,
  value: null,
  error: null,
};

const EMPTY_ROOM_OVERRIDE: OverrideParseResult<Record<string, unknown>> = {
  provided: false,
  value: null,
  error: null,
};

function input(overrides: Partial<WizardInput> = {}): WizardInput {
  return {
    bootstrap: null,
    projectError: null,
    designOverride: EMPTY_OVERRIDE,
    roomOverride: EMPTY_ROOM_OVERRIDE,
    excludedFrameKeys: new Set<string>(),
    imageConfig: DEFAULT_IMAGE_CONFIG,
    ...overrides,
  };
}

function stepStates(model: ReturnType<typeof buildWizardModel>) {
  return model.steps.map((s) => s.state);
}

describe('buildWizardModel — step state cascade', () => {
  it('does not let a downstream step show complete while an upstream step is unsatisfied', () => {
    // Defaults validate, so before the refactor this test was
    // [current, pending, complete] — leaking step 3 readiness while
    // the user hadn't even loaded a project yet.
    const model = buildWizardModel(input());
    expect(stepStates(model)).toEqual(['current', 'pending', 'pending']);
    expect(model.canSubmit).toBe(false);
  });

  it('only marks each step complete after every prior step is complete', () => {
    // Bootstrap loaded but all frames excluded — step 2 is the cursor.
    const excluded = new Set([cameraFrameKey(FRAME, 0)]);
    const model = buildWizardModel(input({ bootstrap: bootstrap(), excludedFrameKeys: excluded }));
    expect(stepStates(model)).toEqual(['complete', 'current', 'pending']);
  });

  it('flips the project step to error when fetching failed and freezes downstream steps', () => {
    const model = buildWizardModel(input({ projectError: 'boom' }));
    expect(stepStates(model)).toEqual(['error', 'pending', 'pending']);
  });

  it('hides a downstream error while an upstream step is still the cursor', () => {
    // Pasted-override JSON is broken (would normally surface as a step-2
    // error), but no project has been loaded yet. The cascade should keep
    // step 2 'pending' so the user finishes step 1 before we surface the
    // deeper failure — this is the documented signal trade-off.
    const model = buildWizardModel(
      input({
        bootstrap: null,
        designOverride: { provided: true, value: null, error: 'Invalid JSON.' },
      }),
    );
    expect(stepStates(model)).toEqual(['current', 'pending', 'pending']);
    // The error message is still collected so the user sees *what's
    // wrong* in the footer summary once they look at the bullet list —
    // we just don't paint step 2 red while step 1 is the focus.
    expect(model.dataIssues).toContain('Design materials: Invalid JSON.');
    expect(model.allIssues).toContain('Design materials: Invalid JSON.');
  });

  it('marks every step complete on the happy path', () => {
    const model = buildWizardModel(input({ bootstrap: bootstrap() }));
    expect(stepStates(model)).toEqual(['complete', 'complete', 'complete']);
    expect(model.canSubmit).toBe(true);
    expect(model.summary).toContain('PRJ-1');
    expect(model.summary).toContain('1920×1440');
  });

  it('reports the included frame count in the data step description', () => {
    const model = buildWizardModel(
      input({
        bootstrap: bootstrap({ cameraFrames: [FRAME, { ...FRAME, priority: 2 }] }),
      }),
    );
    expect(model.includedFrameCount).toBe(2);
    expect(model.steps[1]?.description).toBe('2/2 frames');
    expect(model.summary).toMatch(/Submit 2 frames/);
  });
});

describe('buildWizardModel — per-step issues are scoped', () => {
  it('keeps a missing-project blocker out of the data step', () => {
    const model = buildWizardModel(input());
    expect(model.projectIssues).toContain('Load a project in step 1 to populate camera frames.');
    expect(model.dataIssues).toEqual([]);
    expect(model.configIssues).toEqual([]);
  });

  it('keeps image config errors out of the data step', () => {
    const imageConfig: ImageConfigState = { ...DEFAULT_IMAGE_CONFIG, width: '0' };
    const model = buildWizardModel(input({ bootstrap: bootstrap(), imageConfig }));
    expect(model.dataIssues).toEqual([]);
    expect(model.configIssues).toEqual(['Set positive width and height in the image config.']);
    // The config step itself is the cursor; the data step is already complete.
    expect(stepStates(model)).toEqual(['complete', 'complete', 'current']);
  });

  it('keeps override parse errors in the data step', () => {
    const model = buildWizardModel(
      input({
        bootstrap: bootstrap(),
        designOverride: { provided: true, value: null, error: 'Invalid JSON.' },
      }),
    );
    expect(model.dataIssues).toContain('Design materials: Invalid JSON.');
    expect(model.projectIssues).toEqual([]);
    expect(model.configIssues).toEqual([]);
    expect(model.steps[1]?.state).toBe('error');
  });

  it('reports missing project materials only in the data step', () => {
    const model = buildWizardModel(
      input({ bootstrap: bootstrap({ designMaterials: null, roomData: null }) }),
    );
    expect(model.dataIssues).toEqual(
      expect.arrayContaining([
        'Design materials are missing for this project.',
        'Room layout is missing for this project.',
      ]),
    );
    expect(model.projectIssues).toEqual([]);
  });

  it('exposes a flat allIssues list in step order for the summary footer', () => {
    const imageConfig: ImageConfigState = { ...DEFAULT_IMAGE_CONFIG, width: '0' };
    const model = buildWizardModel(
      input({
        bootstrap: bootstrap({ designMaterials: null }),
        imageConfig,
      }),
    );
    expect(model.allIssues).toEqual([
      // No project issues — bootstrap is loaded.
      'Design materials are missing for this project.',
      'Set positive width and height in the image config.',
    ]);
  });
});

describe('buildWizardModel — overrides', () => {
  it('uses the override design materials when provided', () => {
    const overrideDesign: UnitySlimDesignMaterials = {
      id: 'override',
      objects: {},
      surfaces: {},
    };
    const model = buildWizardModel(
      input({
        bootstrap: bootstrap({ designMaterials: null }),
        designOverride: { provided: true, value: overrideDesign, error: null },
      }),
    );
    expect(model.effectiveDesignMaterials).toEqual(overrideDesign);
    expect(model.canSubmit).toBe(true);
  });

  it('does not let overrides alone satisfy submit when no project is loaded', () => {
    // Camera frames have to come from a project. Even with both overrides
    // valid, we should still block submit and tell the user why.
    const model = buildWizardModel(
      input({
        designOverride: { provided: true, value: DESIGN, error: null },
        roomOverride: { provided: true, value: ROOM_DATA, error: null },
      }),
    );
    expect(model.canSubmit).toBe(false);
    expect(model.projectIssues).toContain('Load a project in step 1 to populate camera frames.');
  });
});
