import { db } from '@/db/V2';
import {
  generation,
  generationInput,
  generationResult,
  generationStepExecution,
  imagePreset,
  modelV2,
  presetProductImage,
  presetSceneImage,
  promptVersion,
  resultEvaluation,
  strategyStep,
  strategyV2,
} from '@/db/V2/schema';
import { generateImage } from '@/lib/models';
import { and, asc, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { presetId, strategyId } = body;

    if (!presetId || !strategyId) {
      return NextResponse.json({ error: 'presetId and strategyId required' }, { status: 400 });
    }

    // ------------------------------------------------------------------
    // Fetch preset
    // ------------------------------------------------------------------
    const [preset] = await db
      .select()
      .from(imagePreset)
      .where(eq(imagePreset.id, presetId))
      .limit(1);

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // Fetch strategy
    // ------------------------------------------------------------------
    const [strategy] = await db
      .select()
      .from(strategyV2)
      .where(eq(strategyV2.id, strategyId))
      .limit(1);

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // ------------------------------------------------------------------
    // Fetch ordered steps
    // ------------------------------------------------------------------
    const steps = await db
      .select()
      .from(strategyStep)
      .where(eq(strategyStep.strategyId, strategyId))
      .orderBy(asc(strategyStep.order));

    if (!steps.length) {
      return NextResponse.json({ error: 'Strategy has no steps' }, { status: 400 });
    }

    const firstStep = steps[0];

    if (!firstStep.promptVersionId) {
      return NextResponse.json(
        { error: 'First strategy step missing promptVersionId' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Insert generation (compatibility: promptVersionId from first step)
    // ------------------------------------------------------------------
    const [newGeneration] = await db
      .insert(generation)
      .values({
        promptVersionId: firstStep.promptVersionId,
        inputPresetId: presetId,
        strategyId,
        renovationType: preset.renovationType ?? 'FULL',
      })
      .returning();

    // ------------------------------------------------------------------
    // Snapshot preset images into generation_input
    // ------------------------------------------------------------------
    const sceneImages = await db
      .select()
      .from(presetSceneImage)
      .where(eq(presetSceneImage.presetId, presetId));

    const productImages = await db
      .select()
      .from(presetProductImage)
      .where(eq(presetProductImage.presetId, presetId));

    const sceneMap: Record<string, string | null> = {};
    for (const s of sceneImages) {
      if (s.type === 'DOLLHOUSE_VIEW') sceneMap.dollhouseView = s.url;
      if (s.type === 'REAL_PHOTO') sceneMap.realPhoto = s.url;
      if (s.type === 'MOOD_BOARD') sceneMap.moodBoard = s.url;
    }

    const productMap: Record<string, string | null> = {};
    for (const p of productImages) {
      if (p.category) {
        productMap[p.category.toLowerCase()] = p.imageUrl;
      }
    }

    const [inputSnapshot] = await db
      .insert(generationInput)
      .values({
        generationId: newGeneration.id,
        ...sceneMap,
        ...productMap,
      })
      .returning();

    let totalExecutionTime = 0;

    // ------------------------------------------------------------------
    // Execute each strategy step
    // ------------------------------------------------------------------
    for (const step of steps) {
      if (!step.promptVersionId) continue;

      const [pv] = await db
        .select()
        .from(promptVersion)
        .where(eq(promptVersion.id, step.promptVersionId))
        .limit(1);

      if (!pv) {
        throw new Error(`PromptVersion ${step.promptVersionId} not found`);
      }

      let provider: string;
      let modelName: string;

      if (step.modelId) {
        const [model] = await db
          .select()
          .from(modelV2)
          .where(eq(modelV2.id, step.modelId))
          .limit(1);

        if (!model) {
          throw new Error(`Model ${step.modelId} not found`);
        }

        provider = model.provider;
        modelName = model.name;
      } else {
        throw new Error(`Strategy step ${step.id} missing modelId`);
      }

      // Snapshot step execution
      await db.insert(generationStepExecution).values({
        generationId: newGeneration.id,
        stepOrder: step.order ?? 1,
        systemPrompt: pv.systemPrompt,
        userPrompt: pv.userPrompt,
        modelName,
        provider,
        temperature: step.temperature ?? undefined,
        outputType: step.outputType,
        aspectRatio: step.aspectRatio,
        outputResolution: step.outputResolution,
      });

      // Build labeled input images
      const labeledImages: { url: string; label: string }[] = [];

      if (inputSnapshot.dollhouseView)
        labeledImages.push({
          url: inputSnapshot.dollhouseView,
          label: 'Dollhouse view',
        });

      if (inputSnapshot.realPhoto)
        labeledImages.push({
          url: inputSnapshot.realPhoto,
          label: 'Real photo',
        });

      if (inputSnapshot.moodBoard)
        labeledImages.push({
          url: inputSnapshot.moodBoard,
          label: 'Mood board',
        });

      for (const key of Object.keys(inputSnapshot)) {
        if (!['id', 'generationId', 'dollhouseView', 'realPhoto', 'moodBoard'].includes(key)) {
          const value = (inputSnapshot as any)[key];
          if (value) {
            labeledImages.push({
              url: value,
              label: key,
            });
          }
        }
      }

      const response = await generateImage({
        provider,
        model: modelName,
        systemPrompt: pv.systemPrompt,
        userPrompt: pv.userPrompt,
        inputImages: labeledImages,
        aspectRatio: step.aspectRatio ?? undefined,
        temperature: step.temperature != null ? Number(step.temperature) : undefined,
        numberOfImages: 1,
      });

      totalExecutionTime += response.executionTimeMs;

      for (const url of response.outputUrls) {
        await db.insert(generationResult).values({
          generationId: newGeneration.id,
          url,
        });
      }
    }

    // ------------------------------------------------------------------
    // Update execution time
    // ------------------------------------------------------------------
    await db
      .update(generation)
      .set({ executionTime: totalExecutionTime })
      .where(eq(generation.id, newGeneration.id));

    return NextResponse.json({
      generationId: newGeneration.id,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Generation failed', details: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const presetId = searchParams.get('presetId');
  const strategyId = searchParams.get('strategyId');
  const needsEval = searchParams.get('needsEval');
  const limit = Number(searchParams.get('limit') ?? 20);
  const offset = Number(searchParams.get('offset') ?? 0);

  const conditions: any[] = [];

  if (presetId) {
    conditions.push(eq(generation.inputPresetId, presetId));
  }

  if (strategyId) {
    conditions.push(eq(generation.strategyId, strategyId));
  }

  const baseQuery = db
    .select({
      id: generation.id,
      createdAt: generation.createdAt,
      executionTime: generation.executionTime,
      presetId: generation.inputPresetId,
      strategyId: generation.strategyId,
      renovationType: generation.renovationType,
    })
    .from(generation)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(generation.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = await baseQuery;

  if (needsEval === 'true') {
    const filtered = [];

    for (const row of rows) {
      const results = await db
        .select()
        .from(generationResult)
        .where(eq(generationResult.generationId, row.id));

      const evals = await db
        .select()
        .from(resultEvaluation)
        .where(eq(resultEvaluation.resultId, results[0]?.id ?? ''));

      if (!evals.length) {
        filtered.push(row);
      }
    }

    return NextResponse.json(filtered);
  }

  return NextResponse.json(rows);
}
