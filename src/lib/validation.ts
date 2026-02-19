import { z } from 'zod';

// ------------------------------------
// Shared
// ------------------------------------

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// ------------------------------------
// Prompt Versions
// ------------------------------------

export const createPromptVersionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  system_prompt: z.string().min(1, 'System prompt is required'),
  user_prompt: z.string().min(1, 'User prompt is required'),
  description: z.string().optional(),
  model: z.string().max(255).optional(),
  output_type: z.string().max(50).optional(),
  aspect_ratio: z.string().max(20).optional(),
  output_resolution: z.string().max(20).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
});

export const updatePromptVersionSchema = z.object({
  name: z.string().max(255).optional(),
  description: z.string().optional(),
  system_prompt: z.string().min(1).optional(),
  user_prompt: z.string().min(1).optional(),
  model: z.string().max(255).optional().nullable(),
  output_type: z.string().max(50).optional().nullable(),
  aspect_ratio: z.string().max(20).optional().nullable(),
  output_resolution: z.string().max(20).optional().nullable(),
  temperature: z.coerce.number().min(0).max(2).optional().nullable(),
});

export const listPromptVersionsSchema = paginationSchema.extend({
  include_deleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  sort: z.enum(['created_at', 'name']).default('created_at'),
  order: sortOrderSchema,
});

// ------------------------------------
// Strategies
// ------------------------------------

export const createStrategySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
});

export const strategyStepSchema = z.object({
  step_order: z.number().int().min(1),
  name: z.string().max(255).optional().nullable(),
  prompt_version_id: z.string().uuid(),
  input_preset_id: z.string().uuid().optional().nullable(),
  model: z.string().max(255).default('gemini-2.5-flash-image'),
  aspect_ratio: z.string().max(20).default('1:1'),
  output_resolution: z.string().max(20).default('1K'),
  temperature: z.coerce.number().min(0).max(2).default(1.0),
  use_google_search: z.boolean().default(false),
  tag_images: z.boolean().default(true),
  dollhouse_view_from_step: z.number().int().min(1).optional().nullable(),
  real_photo_from_step: z.number().int().min(1).optional().nullable(),
  mood_board_from_step: z.number().int().min(1).optional().nullable(),
});

export const listStrategiesSchema = paginationSchema.extend({
  include_deleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  sort: z.enum(['created_at', 'name']).default('created_at'),
  order: sortOrderSchema,
});

// ------------------------------------
// Input Presets
// ------------------------------------

export const createInputPresetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  dollhouse_view: z.string().min(1).optional().nullable(),
  real_photo: z.string().min(1).optional().nullable(),
  mood_board: z.string().min(1).optional().nullable(),
  faucets: z.string().min(1).optional().nullable(),
  lightings: z.string().min(1).optional().nullable(),
  lvps: z.string().min(1).optional().nullable(),
  mirrors: z.string().min(1).optional().nullable(),
  paints: z.string().min(1).optional().nullable(),
  robe_hooks: z.string().min(1).optional().nullable(),
  shelves: z.string().min(1).optional().nullable(),
  shower_glasses: z.string().min(1).optional().nullable(),
  shower_systems: z.string().min(1).optional().nullable(),
  floor_tiles: z.string().min(1).optional().nullable(),
  wall_tiles: z.string().min(1).optional().nullable(),
  shower_wall_tiles: z.string().min(1).optional().nullable(),
  shower_floor_tiles: z.string().min(1).optional().nullable(),
  shower_curb_tiles: z.string().min(1).optional().nullable(),
  toilet_paper_holders: z.string().min(1).optional().nullable(),
  toilets: z.string().min(1).optional().nullable(),
  towel_bars: z.string().min(1).optional().nullable(),
  towel_rings: z.string().min(1).optional().nullable(),
  tub_doors: z.string().min(1).optional().nullable(),
  tub_fillers: z.string().min(1).optional().nullable(),
  tubs: z.string().min(1).optional().nullable(),
  vanities: z.string().min(1).optional().nullable(),
  wallpapers: z.string().min(1).optional().nullable(),
});

export const listInputPresetsSchema = paginationSchema.extend({
  include_deleted: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  sort: z.enum(['created_at', 'name']).default('created_at'),
  order: sortOrderSchema,
});

// ------------------------------------
// Generations
// ------------------------------------

export const ratingValues = ['FAILED', 'GOOD'] as const;

export const ratingSchema = z.enum(ratingValues);

/** Schema for the structured input_images object (category-keyed S3 URLs) */
export const generationInputSchema = z.object({
  dollhouse_view: z.string().min(1).optional().nullable(),
  real_photo: z.string().min(1).optional().nullable(),
  mood_board: z.string().min(1).optional().nullable(),
  faucets: z.string().min(1).optional().nullable(),
  lightings: z.string().min(1).optional().nullable(),
  lvps: z.string().min(1).optional().nullable(),
  mirrors: z.string().min(1).optional().nullable(),
  paints: z.string().min(1).optional().nullable(),
  robe_hooks: z.string().min(1).optional().nullable(),
  shelves: z.string().min(1).optional().nullable(),
  shower_glasses: z.string().min(1).optional().nullable(),
  shower_systems: z.string().min(1).optional().nullable(),
  floor_tiles: z.string().min(1).optional().nullable(),
  wall_tiles: z.string().min(1).optional().nullable(),
  shower_wall_tiles: z.string().min(1).optional().nullable(),
  shower_floor_tiles: z.string().min(1).optional().nullable(),
  shower_curb_tiles: z.string().min(1).optional().nullable(),
  toilet_paper_holders: z.string().min(1).optional().nullable(),
  toilets: z.string().min(1).optional().nullable(),
  towel_bars: z.string().min(1).optional().nullable(),
  towel_rings: z.string().min(1).optional().nullable(),
  tub_doors: z.string().min(1).optional().nullable(),
  tub_fillers: z.string().min(1).optional().nullable(),
  tubs: z.string().min(1).optional().nullable(),
  vanities: z.string().min(1).optional().nullable(),
  wallpapers: z.string().min(1).optional().nullable(),
});

export const createGenerationSchema = z.object({
  prompt_version_id: z.string().uuid(),
  input_images: generationInputSchema.optional(),
  output_images: z.array(z.object({ url: z.string().min(1) })).optional(),
  notes: z.string().optional(),
  execution_time: z.number().int().optional(),
});

export const rateGenerationSchema = z.object({
  scene_accuracy_rating: ratingSchema.optional(),
  product_accuracy_rating: ratingSchema.optional(),
}).refine(
  (data) => data.scene_accuracy_rating !== undefined || data.product_accuracy_rating !== undefined,
  { message: 'At least one rating field must be provided' },
);

export const listGenerationsSchema = paginationSchema.extend({
  prompt_version_id: z.string().uuid().optional(),
  scene_accuracy_rating: ratingSchema.optional(),
  product_accuracy_rating: ratingSchema.optional(),
  unrated: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(['created_at']).default('created_at'),
  order: sortOrderSchema,
});

// ------------------------------------
// Images
// ------------------------------------

export const addImageSchema = z.object({
  url: z.string().min(1),
});

// ------------------------------------
// Input category constants
// ------------------------------------

export const PRODUCT_CATEGORIES = [
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

export const CATEGORY_LABELS: Record<string, string> = {
  faucets: 'Faucets',
  lightings: 'Lightings',
  lvps: 'LVPs',
  mirrors: 'Mirrors',
  paints: 'Paints',
  robe_hooks: 'Robe Hooks',
  shelves: 'Shelves',
  shower_glasses: 'Shower Glasses',
  shower_systems: 'Shower Systems',
  floor_tiles: 'Floor Tiles',
  wall_tiles: 'Wall Tiles',
  shower_wall_tiles: 'Shower Wall Tiles',
  shower_floor_tiles: 'Shower Floor Tiles',
  shower_curb_tiles: 'Shower Curb Tiles',
  toilet_paper_holders: 'Toilet Paper Holders',
  toilets: 'Toilets',
  towel_bars: 'Towel Bars',
  towel_rings: 'Towel Rings',
  tub_doors: 'Tub Doors',
  tub_fillers: 'Tub Fillers',
  tubs: 'Tubs',
  vanities: 'Vanities',
  wallpapers: 'Wallpapers',
};

// ------------------------------------
// Evaluations
// ------------------------------------

export const PRODUCT_ACCURACY_ISSUES = [
  'Incorrect scale',
  'Incorrect finish',
  "Didn't follow the reference image",
  'Incorrect tile pattern',
] as const;

export const SCENE_ACCURACY_ISSUES = [
  'Unrealistic lighting & shadows',
  'Perspective drift',
  'Incorrect existing conditions',
  'Changed aspect ratio',
  'Hallucinated details in the room',
] as const;

/** Per-category product accuracy evaluation */
const categoryEvalSchema = z.object({
  issues: z.array(z.string()),
  notes: z.string().optional(),
});

export const upsertEvaluationSchema = z.object({
  result_id: z.string().uuid(),
  product_accuracy: z.record(z.string(), categoryEvalSchema).optional(),
  scene_accuracy_issues: z.array(z.string()).optional(),
  scene_accuracy_notes: z.string().optional(),
});
