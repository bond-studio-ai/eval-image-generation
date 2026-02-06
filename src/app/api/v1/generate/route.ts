import { db } from '@/db';
import { generation, generationInput, generationResult, promptVersion } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { generateWithGemini } from '@/lib/gemini';
import { eq } from 'drizzle-orm';

/** All product category keys that can appear in input_images */
const PRODUCT_CATEGORIES = [
  'faucets',
  'lightings',
  'lvps',
  'mirrors',
  'paints',
  'robe_hooks',
  'shelves',
  'shower_glasses',
  'shower_systems',
  'floor_tiles',
  'wall_tiles',
  'shower_wall_tiles',
  'shower_floor_tiles',
  'shower_curb_tiles',
  'toilet_paper_holders',
  'toilets',
  'towel_bars',
  'towel_rings',
  'tub_doors',
  'tub_fillers',
  'tubs',
  'vanities',
  'wallpapers',
] as const;

const SCENE_KEYS = ['dollhouse_view', 'real_photo'] as const;
const ALL_INPUT_KEYS = [...SCENE_KEYS, ...PRODUCT_CATEGORIES] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt_version_id, input_images, number_of_images } = body as {
      prompt_version_id: string;
      input_images?: Record<string, string | null>;
      number_of_images?: number;
    };

    if (!prompt_version_id) {
      return errorResponse('VALIDATION_ERROR', 'prompt_version_id is required');
    }

    // Fetch the prompt version
    const pv = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, prompt_version_id),
    });

    if (!pv) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    // Collect all non-null image URLs from input
    const imageUrls: string[] = [];
    if (input_images) {
      for (const key of ALL_INPUT_KEYS) {
        const url = input_images[key];
        if (url) imageUrls.push(url);
      }
    }

    // Call Gemini API
    const geminiResult = await generateWithGemini({
      systemPrompt: pv.systemPrompt,
      userPrompt: pv.userPrompt,
      model: pv.model || 'gemini-2.5-flash-image',
      inputImageUrls: imageUrls,
      aspectRatio: pv.aspectRatio ?? undefined,
      imageSize: pv.outputResolution ?? undefined,
      temperature: pv.temperature ? Number(pv.temperature) : undefined,
      numberOfImages: number_of_images,
    });

    // Create generation row
    const [gen] = await db
      .insert(generation)
      .values({
        promptVersionId: prompt_version_id,
        executionTime: Math.round(geminiResult.executionTimeMs),
      })
      .returning();

    // Insert generation_input row
    if (input_images) {
      // Build the insert values, converting snake_case keys to camelCase
      const inputValues: Record<string, unknown> = {
        generationId: gen.id,
      };

      // Map snake_case column keys to camelCase field names
      const keyMap: Record<string, string> = {
        dollhouse_view: 'dollhouseView',
        real_photo: 'realPhoto',
        faucets: 'faucets',
        lightings: 'lightings',
        lvps: 'lvps',
        mirrors: 'mirrors',
        paints: 'paints',
        robe_hooks: 'robeHooks',
        shelves: 'shelves',
        shower_glasses: 'showerGlasses',
        shower_systems: 'showerSystems',
        floor_tiles: 'floorTiles',
        wall_tiles: 'wallTiles',
        shower_wall_tiles: 'showerWallTiles',
        shower_floor_tiles: 'showerFloorTiles',
        shower_curb_tiles: 'showerCurbTiles',
        toilet_paper_holders: 'toiletPaperHolders',
        toilets: 'toilets',
        towel_bars: 'towelBars',
        towel_rings: 'towelRings',
        tub_doors: 'tubDoors',
        tub_fillers: 'tubFillers',
        tubs: 'tubs',
        vanities: 'vanities',
        wallpapers: 'wallpapers',
      };

      for (const [snakeKey, camelKey] of Object.entries(keyMap)) {
        const val = input_images[snakeKey];
        if (val) inputValues[camelKey] = val;
      }

      await db.insert(generationInput).values(inputValues as typeof generationInput.$inferInsert);
    }

    // Insert generation_result rows for each output image
    if (geminiResult.outputUrls.length > 0) {
      await db.insert(generationResult).values(
        geminiResult.outputUrls.map((url) => ({
          generationId: gen.id,
          url,
        })),
      );
    }

    return successResponse({
      generation_id: gen.id,
      output_urls: geminiResult.outputUrls,
      execution_time_ms: geminiResult.executionTimeMs,
      model: geminiResult.model,
      text_response: geminiResult.textResponse,
    });
  } catch (error) {
    console.error('Error in generation:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate';
    return errorResponse('INTERNAL_ERROR', message);
  }
}
