import { db } from '@/db';
import { generation, generationInput, generationResult, inputPreset, promptVersion, strategy, strategyRun, strategyRunInputPreset, strategyStep, strategyStepResult } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { generateWithGemini } from '@/lib/gemini';
import { uuidSchema } from '@/lib/validation';
import { asc, eq, inArray } from 'drizzle-orm';
import { after, NextRequest } from 'next/server';

/** Preset data extracted from a single input_preset row for one run. */
interface PresetData {
  sceneImages: Record<string, string>;
  productImages: Record<string, string[]>;
  arbitrary: { url: string; tag?: string }[];
}

const SCENE_KEYS = ['dollhouse_view', 'real_photo', 'mood_board'] as const;
const PRODUCT_CATEGORIES = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robe_hooks',
  'shelves', 'shower_glasses', 'shower_systems', 'floor_tiles', 'wall_tiles',
  'shower_wall_tiles', 'shower_floor_tiles', 'shower_curb_tiles',
  'toilet_paper_holders', 'toilets', 'towel_bars', 'towel_rings',
  'tub_doors', 'tub_fillers', 'tubs', 'vanities', 'wallpapers',
] as const;
const ALL_INPUT_KEYS = [...SCENE_KEYS, ...PRODUCT_CATEGORIES] as const;

const INPUT_KEY_LABELS: Record<(typeof ALL_INPUT_KEYS)[number], string> = {
  dollhouse_view: 'Dollhouse view (scene)', real_photo: 'Real photo (scene)', mood_board: 'Mood board (scene)',
  faucets: 'Faucet', lightings: 'Lighting', lvps: 'LVP', mirrors: 'Mirror', paints: 'Paint',
  robe_hooks: 'Robe hook', shelves: 'Shelf', shower_glasses: 'Shower glass', shower_systems: 'Shower system',
  floor_tiles: 'Floor tile', wall_tiles: 'Wall tile', shower_wall_tiles: 'Shower wall tile',
  shower_floor_tiles: 'Shower floor tile', shower_curb_tiles: 'Shower curb tile',
  toilet_paper_holders: 'Toilet paper holder', toilets: 'Toilet', towel_bars: 'Towel bar',
  towel_rings: 'Towel ring', tub_doors: 'Tub door', tub_fillers: 'Tub filler', tubs: 'Tub',
  vanities: 'Vanity', wallpapers: 'Wallpaper',
};

const SNAKE_TO_CAMEL: Record<string, string> = {
  dollhouse_view: 'dollhouseView', real_photo: 'realPhoto', mood_board: 'moodBoard',
  faucets: 'faucets', lightings: 'lightings', lvps: 'lvps', mirrors: 'mirrors', paints: 'paints',
  robe_hooks: 'robeHooks', shelves: 'shelves', shower_glasses: 'showerGlasses',
  shower_systems: 'showerSystems', floor_tiles: 'floorTiles', wall_tiles: 'wallTiles',
  shower_wall_tiles: 'showerWallTiles', shower_floor_tiles: 'showerFloorTiles',
  shower_curb_tiles: 'showerCurbTiles', toilet_paper_holders: 'toiletPaperHolders',
  toilets: 'toilets', towel_bars: 'towelBars', towel_rings: 'towelRings',
  tub_doors: 'tubDoors', tub_fillers: 'tubFillers', tubs: 'tubs', vanities: 'vanities',
  wallpapers: 'wallpapers',
};

type StepRow = typeof strategyStep.$inferSelect;

function buildDepsMap(steps: StepRow[]): Map<number, Set<number>> {
  const deps = new Map<number, Set<number>>();
  for (const step of steps) {
    const d = new Set<number>();
    if (step.dollhouseViewFromStep != null) d.add(step.dollhouseViewFromStep);
    if (step.realPhotoFromStep != null) d.add(step.realPhotoFromStep);
    if (step.moodBoardFromStep != null) d.add(step.moodBoardFromStep);
    if (step.arbitraryImageFromStep != null) d.add(step.arbitraryImageFromStep);
    deps.set(step.stepOrder, d);
  }
  return deps;
}

function getTransitiveDependents(stepOrder: number, deps: Map<number, Set<number>>): Set<number> {
  const dependents = new Set<number>();
  const queue = [stepOrder];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [order, d] of deps) {
      if (d.has(current) && !dependents.has(order)) {
        dependents.add(order);
        queue.push(order);
      }
    }
  }
  return dependents;
}

function extractPresetData(presetRow: Record<string, unknown>): PresetData {
  const sceneImages: Record<string, string> = {};
  const productImages: Record<string, string[]> = {};
  const arbitrary: { url: string; tag?: string }[] = [];

  for (const key of SCENE_KEYS) {
    const camelKey = SNAKE_TO_CAMEL[key];
    const val = presetRow[camelKey];
    if (typeof val === 'string' && val) sceneImages[key] = val;
  }

  for (const key of PRODUCT_CATEGORIES) {
    const camelKey = SNAKE_TO_CAMEL[key];
    const val = presetRow[camelKey];
    const urls = Array.isArray(val)
      ? val.filter((v): v is string => typeof v === 'string' && !!v)
      : (typeof val === 'string' && val ? [val] : []);
    if (urls.length > 0) productImages[key] = urls;
  }

  const images = presetRow.arbitraryImages as { url: string; tag?: string }[] | undefined;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (item && typeof item.url === 'string' && item.url) {
        arbitrary.push({ url: item.url, tag: typeof item.tag === 'string' ? item.tag : undefined });
      }
    }
  }

  return { sceneImages, productImages, arbitrary };
}

async function loadPresetForRun(runId: string): Promise<PresetData> {
  const runPresets = await db.query.strategyRunInputPreset.findMany({
    where: eq(strategyRunInputPreset.strategyRunId, runId),
    orderBy: [asc(strategyRunInputPreset.order)],
    with: { inputPreset: true },
  });

  if (runPresets.length === 0) return { sceneImages: {}, productImages: {}, arbitrary: [] };

  // Each run has exactly one preset now (parallel model)
  const preset = runPresets[0].inputPreset as unknown as Record<string, unknown>;
  if (!preset) return { sceneImages: {}, productImages: {}, arbitrary: [] };

  return extractPresetData(preset);
}

async function executeSingleStep(
  step: StepRow,
  stepResultId: string,
  stepOutputs: Map<number, string>,
  presetData: PresetData,
  isLastStep: boolean,
): Promise<string | null> {
  await db
    .update(strategyStepResult)
    .set({ status: 'running' })
    .where(eq(strategyStepResult.id, stepResultId));

  const pv = await db.query.promptVersion.findFirst({
    where: eq(promptVersion.id, step.promptVersionId),
  });
  if (!pv) throw new Error(`Prompt version ${step.promptVersionId} not found`);

  const sceneMap: Record<string, string | null> = {};
  const productMap: Record<string, string[]> = {};

  const includeDollhouse = step.includeDollhouse ?? true;
  const includeRealPhoto = step.includeRealPhoto ?? true;
  const includeMoodBoard = step.includeMoodBoard ?? true;
  const includeProducts = Array.isArray(step.includeProductCategories) ? step.includeProductCategories : [];
  for (const key of SCENE_KEYS) {
    if (key === 'dollhouse_view' && !includeDollhouse) continue;
    if (key === 'real_photo' && !includeRealPhoto) continue;
    if (key === 'mood_board' && !includeMoodBoard) continue;
    const val = presetData.sceneImages[key];
    if (val) sceneMap[key] = val;
  }
  for (const key of PRODUCT_CATEGORIES) {
    if (!includeProducts.includes(key)) continue;
    const urls = presetData.productImages[key];
    if (urls && urls.length > 0) productMap[key] = [...urls];
  }

  if (step.dollhouseViewFromStep != null) {
    const url = stepOutputs.get(step.dollhouseViewFromStep);
    if (url) sceneMap.dollhouse_view = url;
  }
  if (step.realPhotoFromStep != null) {
    const url = stepOutputs.get(step.realPhotoFromStep);
    if (url) sceneMap.real_photo = url;
  }
  if (step.moodBoardFromStep != null) {
    const url = stepOutputs.get(step.moodBoardFromStep);
    if (url) sceneMap.mood_board = url;
  }

  const labeledImages: { url: string; label: string }[] = [];
  for (const key of SCENE_KEYS) {
    const url = sceneMap[key];
    if (url) labeledImages.push({ url, label: INPUT_KEY_LABELS[key] });
  }
  for (const key of PRODUCT_CATEGORIES) {
    const urls = productMap[key];
    if (urls) {
      urls.forEach((url, i) => {
        const suffix = urls.length > 1 ? ` ${i + 1}` : '';
        labeledImages.push({ url, label: `${INPUT_KEY_LABELS[key]}${suffix}` });
      });
    }
  }

  if (step.arbitraryImageFromStep != null) {
    const url = stepOutputs.get(step.arbitraryImageFromStep);
    if (url) {
      labeledImages.push({ url, label: `Output from Step ${step.arbitraryImageFromStep}` });
    }
  }

  presetData.arbitrary.forEach((item, i) => {
    if (item.url) {
      labeledImages.push({ url: item.url, label: item.tag?.trim() || `Additional image ${i + 1}` });
    }
  });

  const geminiResult = await generateWithGemini({
    systemPrompt: pv.systemPrompt,
    userPrompt: pv.userPrompt,
    model: step.model,
    inputImages: labeledImages,
    aspectRatio: step.aspectRatio,
    imageSize: step.outputResolution,
    temperature: step.temperature ? Number(step.temperature) : undefined,
    numberOfImages: 1,
    useGoogleSearch: step.useGoogleSearch,
    tagImages: step.tagImages,
  });

  const outputUrl = geminiResult.outputUrls[0] ?? null;

  let generationId: string | null = null;

  if (isLastStep) {
    const [gen] = await db
      .insert(generation)
      .values({
        promptVersionId: step.promptVersionId,
        inputPresetId: null,
        executionTime: Math.round(geminiResult.executionTimeMs),
      })
      .returning();

    generationId = gen.id;

    const hasInputs = Object.keys(sceneMap).length > 0 || Object.keys(productMap).length > 0;
    if (hasInputs) {
      const inputValues: Record<string, unknown> = { generationId: gen.id };
      for (const key of SCENE_KEYS) {
        const val = sceneMap[key];
        if (val) inputValues[SNAKE_TO_CAMEL[key]] = val;
      }
      for (const key of PRODUCT_CATEGORIES) {
        const urls = productMap[key];
        if (urls && urls.length > 0) inputValues[SNAKE_TO_CAMEL[key]] = urls;
      }
      await db.insert(generationInput).values(inputValues as typeof generationInput.$inferInsert);
    }

    if (outputUrl) {
      await db.insert(generationResult).values({ generationId: gen.id, url: outputUrl });
    }
  }

  await db
    .update(strategyStepResult)
    .set({
      status: 'completed',
      generationId,
      outputUrl,
      executionTime: Math.round(geminiResult.executionTimeMs),
    })
    .where(eq(strategyStepResult.id, stepResultId));

  return outputUrl;
}

export async function executeSteps(runId: string, steps: StepRow[]) {
  const stepResultRows = await db.query.strategyStepResult.findMany({
    where: eq(strategyStepResult.strategyRunId, runId),
  });

  const presetData = await loadPresetForRun(runId);

  const stepResultByStepId = new Map(stepResultRows.map((sr) => [sr.strategyStepId, sr]));
  const stepOutputs = new Map<number, string>();
  const deps = buildDepsMap(steps);
  const stepByOrder = new Map(steps.map((s) => [s.stepOrder, s]));

  const maxStepOrder = Math.max(...steps.map((s) => s.stepOrder));

  const completed = new Set<number>();
  const failed = new Set<number>();
  const running = new Map<number, Promise<{ stepOrder: number; ok: boolean }>>();

  // Seed completed set and stepOutputs from already-completed step results (for retries)
  for (const step of steps) {
    const sr = stepResultByStepId.get(step.id);
    if (sr && sr.status === 'completed') {
      completed.add(step.stepOrder);
      if (sr.outputUrl) stepOutputs.set(step.stepOrder, sr.outputUrl);
    }
  }

  const isReady = (stepOrder: number) => {
    const d = deps.get(stepOrder)!;
    return [...d].every((dep) => completed.has(dep));
  };

  const dispatch = (step: StepRow) => {
    const stepResult = stepResultByStepId.get(step.id)!;
    const isLast = step.stepOrder === maxStepOrder;
    const promise = executeSingleStep(step, stepResult.id, stepOutputs, presetData, isLast)
      .then((outputUrl) => {
        if (outputUrl) stepOutputs.set(step.stepOrder, outputUrl);
        return { stepOrder: step.stepOrder, ok: true };
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : 'Step failed';
        console.error('Step failed:', error);
        await db
          .update(strategyStepResult)
          .set({ status: 'failed', error: message })
          .where(eq(strategyStepResult.id, stepResult.id));
        return { stepOrder: step.stepOrder, ok: false };
      });
    running.set(step.stepOrder, promise);
  };

  while (completed.size + failed.size < steps.length) {
    for (const step of steps) {
      const order = step.stepOrder;
      if (!completed.has(order) && !failed.has(order) && !running.has(order) && isReady(order)) {
        dispatch(step);
      }
    }

    if (running.size === 0) break;

    const result = await Promise.race([...running.values()]);
    running.delete(result.stepOrder);

    if (result.ok) {
      completed.add(result.stepOrder);
    } else {
      failed.add(result.stepOrder);
      const downstream = getTransitiveDependents(result.stepOrder, deps);
      for (const depOrder of downstream) {
        if (!completed.has(depOrder) && !failed.has(depOrder)) {
          failed.add(depOrder);
          const depStep = stepByOrder.get(depOrder)!;
          const depResult = stepResultByStepId.get(depStep.id)!;
          await db
            .update(strategyStepResult)
            .set({ status: 'failed', error: `Skipped: dependency step ${result.stepOrder} failed` })
            .where(eq(strategyStepResult.id, depResult.id));
        }
      }
    }
  }

  const hasFailed = failed.size > 0;
  await db
    .update(strategyRun)
    .set({
      status: hasFailed ? 'failed' : 'completed',
      completedAt: new Date(),
    })
    .where(eq(strategyRun.id, runId));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!uuidSchema.safeParse(id).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid strategy ID');
    }

    const body = await request.json().catch(() => null);
    const rawIds = body?.input_preset_ids;

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'At least one input preset is required');
    }

    const inputPresetIds = rawIds.filter(
      (x: unknown) => typeof x === 'string' && uuidSchema.safeParse(x).success,
    ) as string[];

    if (inputPresetIds.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'At least one valid input preset ID is required');
    }

    // Verify all presets exist
    const existingPresets = await db
      .select({ id: inputPreset.id })
      .from(inputPreset)
      .where(inArray(inputPreset.id, inputPresetIds));
    const existingIds = new Set(existingPresets.map((p) => p.id));
    const missingIds = inputPresetIds.filter((pid) => !existingIds.has(pid));
    if (missingIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', `Input presets not found: ${missingIds.join(', ')}`);
    }

    const strat = await db.query.strategy.findFirst({
      where: eq(strategy.id, id),
      with: {
        steps: {
          orderBy: [strategyStep.stepOrder],
        },
      },
    });

    if (!strat) {
      return errorResponse('NOT_FOUND', 'Strategy not found');
    }

    if (strat.steps.length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Strategy has no steps');
    }

    // Create one run per input preset (they execute in parallel)
    const runs: { id: string; inputPresetId: string }[] = [];

    for (const presetId of inputPresetIds) {
      const [run] = await db
        .insert(strategyRun)
        .values({ strategyId: id, status: 'running' })
        .returning();

      await db
        .insert(strategyStepResult)
        .values(
          strat.steps.map((step) => ({
            strategyRunId: run.id,
            strategyStepId: step.id,
            status: 'pending',
          })),
        );

      await db.insert(strategyRunInputPreset).values({
        strategyRunId: run.id,
        inputPresetId: presetId,
        order: 0,
      });

      runs.push({ id: run.id, inputPresetId: presetId });
    }

    // Fire all runs in parallel
    for (const run of runs) {
      after(() => executeSteps(run.id, strat.steps));
    }

    return successResponse(
      { runs: runs.map((r) => ({ id: r.id, inputPresetId: r.inputPresetId, status: 'running' })) },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run strategy';
    return errorResponse('INTERNAL_ERROR', message);
  }
}
