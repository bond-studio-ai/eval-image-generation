import { db } from '@/db';
import { inputPreset, promptVersion } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import {
  buildPresetContext,
  PresetContextData,
  renderPromptTemplate,
} from '@/lib/handlebars-prompt';
import { enrichProductImages } from '@/lib/product-catalog';
import { uuidSchema } from '@/lib/validation';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

const SNAKE_TO_CAMEL: Record<string, string> = {
  dollhouse_view: 'dollhouseView',
  real_photo: 'realPhoto',
  mood_board: 'moodBoard',
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

const SCENE_KEYS = ['dollhouse_view', 'real_photo', 'mood_board'] as const;
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

function extractPresetData(presetRow: Record<string, unknown>): PresetContextData {
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
      : typeof val === 'string' && val
        ? [val]
        : [];
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: promptVersionId } = await params;
    if (!uuidSchema.safeParse(promptVersionId).success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid prompt version ID');
    }

    const body = await request.json().catch(() => ({}));
    const presetIds = Array.isArray(body.preset_ids)
      ? body.preset_ids.filter((x: unknown) => typeof x === 'string')
      : [];
    const systemPrompt =
      typeof body.system_prompt === 'string' ? body.system_prompt : undefined;
    const userPrompt =
      typeof body.user_prompt === 'string' ? body.user_prompt : undefined;

    const pv = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, promptVersionId),
    });
    if (!pv) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    const systemTemplate = systemPrompt ?? pv.systemPrompt ?? '';
    const userTemplate = userPrompt ?? pv.userPrompt ?? '';

    const presets =
      presetIds.length > 0
        ? await db
            .select()
            .from(inputPreset)
            .where(
              and(
                inArray(inputPreset.id, presetIds),
                isNull(inputPreset.deletedAt),
              ),
            )
        : await db
            .select()
            .from(inputPreset)
            .where(isNull(inputPreset.deletedAt));

    const previews = await Promise.all(
      presets.map(async (preset) => {
        const presetRow = preset as unknown as Record<string, unknown>;
        const presetData = extractPresetData(presetRow);
        presetData.productItems = await enrichProductImages(presetData.productImages);
        const context = buildPresetContext(presetData);

        const renderedSystem = renderPromptTemplate(systemTemplate, context);
        const renderedUser = renderPromptTemplate(userTemplate, context);

        return {
          preset_id: preset.id,
          preset_name: preset.name ?? 'Untitled',
          system_prompt: renderedSystem,
          user_prompt: renderedUser,
        };
      }),
    );

    return successResponse({ previews });
  } catch (error) {
    console.error('Error generating prompt preview:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to generate preview');
  }
}
