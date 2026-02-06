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
  name: z.string().max(255).optional(),
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
// Generations
// ------------------------------------

export const ratingValues = ['FAILED', 'POOR', 'ACCEPTABLE', 'GOOD', 'EXCELLENT'] as const;

export const ratingSchema = z.enum(ratingValues);

export const createGenerationSchema = z.object({
  prompt_version_id: z.string().uuid(),
  input_images: z.array(z.object({ url: z.string().url() })).optional(),
  output_images: z.array(z.object({ url: z.string().url() })).optional(),
  notes: z.string().optional(),
  execution_time: z.number().int().optional(),
});

export const rateGenerationSchema = z.object({
  rating: ratingSchema,
});

export const listGenerationsSchema = paginationSchema.extend({
  prompt_version_id: z.string().uuid().optional(),
  rating: ratingSchema.optional(),
  unrated: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(['created_at', 'rating']).default('created_at'),
  order: sortOrderSchema,
});

// ------------------------------------
// Images
// ------------------------------------

export const addImageSchema = z.object({
  url: z.string().url(),
});
