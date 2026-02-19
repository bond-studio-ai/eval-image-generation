import { relations, sql } from 'drizzle-orm';
import {
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ------------------------------------
// Enums
// ------------------------------------

export const generationRatingEnum = pgEnum('generation_rating', [
  'FAILED',
  'GOOD',
]);

// ------------------------------------
// Tables
// ------------------------------------

export const promptVersion = pgTable(
  'prompt_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Prompt content
    systemPrompt: text('system_prompt').notNull(),
    userPrompt: text('user_prompt').notNull(),

    // Metadata
    name: varchar('name', { length: 255 }),
    description: text('description'),

    // Model settings
    model: varchar('model', { length: 255 }),
    outputType: varchar('output_type', { length: 50 }),
    aspectRatio: varchar('aspect_ratio', { length: 20 }),
    outputResolution: varchar('output_resolution', { length: 20 }),
    temperature: decimal('temperature', { precision: 3, scale: 2 }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_prompt_version_created_at').on(table.createdAt),
    index('idx_prompt_version_active')
      .on(table.createdAt)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const generation = pgTable(
  'generation',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    promptVersionId: uuid('prompt_version_id')
      .notNull()
      .references(() => promptVersion.id, { onDelete: 'restrict' }),
    inputPresetId: uuid('input_preset_id')
      .references(() => inputPreset.id, { onDelete: 'set null' }),
    // FK enforced at DB level; inline reference omitted to avoid circular dependency
    strategyId: uuid('strategy_id'),

    // Ratings
    sceneAccuracyRating: generationRatingEnum('scene_accuracy_rating'),
    productAccuracyRating: generationRatingEnum('product_accuracy_rating'),

    // Additional data
    notes: text('notes'),
    executionTime: integer('execution_time'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_generation_prompt_version').on(table.promptVersionId),
    index('idx_generation_input_preset').on(table.inputPresetId),
    index('idx_generation_strategy').on(table.strategyId),
    index('idx_generation_created_at').on(table.createdAt),
    index('idx_generation_scene_rating')
      .on(table.sceneAccuracyRating)
      .where(sql`scene_accuracy_rating IS NOT NULL`),
    index('idx_generation_product_rating')
      .on(table.productAccuracyRating)
      .where(sql`product_accuracy_rating IS NOT NULL`),
  ],
);

/**
 * generation_input: one-to-one with generation.
 * Each column stores an S3 URL for a specific image type.
 */
export const generationInput = pgTable(
  'generation_input',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),

    // Scene images (S3 URLs)
    dollhouseView: text('dollhouse_view'),
    realPhoto: text('real_photo'),
    moodBoard: text('mood_board'),

    // Product images (S3 URLs) -- one per category
    faucets: text('faucets'),
    lightings: text('lightings'),
    lvps: text('lvps'),
    mirrors: text('mirrors'),
    paints: text('paints'),
    robeHooks: text('robe_hooks'),
    shelves: text('shelves'),
    showerGlasses: text('shower_glasses'),
    showerSystems: text('shower_systems'),
    floorTiles: text('floor_tiles'),
    wallTiles: text('wall_tiles'),
    showerWallTiles: text('shower_wall_tiles'),
    showerFloorTiles: text('shower_floor_tiles'),
    showerCurbTiles: text('shower_curb_tiles'),
    toiletPaperHolders: text('toilet_paper_holders'),
    toilets: text('toilets'),
    towelBars: text('towel_bars'),
    towelRings: text('towel_rings'),
    tubDoors: text('tub_doors'),
    tubFillers: text('tub_fillers'),
    tubs: text('tubs'),
    vanities: text('vanities'),
    wallpapers: text('wallpapers'),
  },
  (table) => [unique('uq_generation_input').on(table.generationId)],
);

/**
 * generation_result: one-to-many with generation.
 * Each row is one output image.
 */
export const generationResult = pgTable(
  'generation_result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
  },
  (table) => [index('idx_result_generation').on(table.generationId)],
);

/**
 * result_evaluation: one-to-one with generation_result.
 * Stores evaluation criteria per output image.
 */
export const resultEvaluation = pgTable(
  'result_evaluation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resultId: uuid('result_id')
      .notNull()
      .references(() => generationResult.id, { onDelete: 'cascade' }),

    // Product Accuracy -- per-category evaluation
    // JSON object: { "faucets": { "issues": [...], "notes": "..." }, ... }
    productAccuracy: text('product_accuracy'),

    // Scene Accuracy
    sceneAccuracyIssues: text('scene_accuracy_issues'), // JSON array
    sceneAccuracyNotes: text('scene_accuracy_notes'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_result_evaluation').on(table.resultId),
    index('idx_result_evaluation_result').on(table.resultId),
  ],
);

/**
 * input_preset: shared, reusable set of input images.
 * Any user can select a preset to populate the generate page.
 * Mirrors the image columns of generation_input.
 */
export const inputPreset = pgTable(
  'input_preset',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Metadata
    name: varchar('name', { length: 255 }),
    description: text('description'),

    // Scene images (S3 URLs)
    dollhouseView: text('dollhouse_view'),
    realPhoto: text('real_photo'),
    moodBoard: text('mood_board'),

    // Product images (S3 URLs) -- one per category
    faucets: text('faucets'),
    lightings: text('lightings'),
    lvps: text('lvps'),
    mirrors: text('mirrors'),
    paints: text('paints'),
    robeHooks: text('robe_hooks'),
    shelves: text('shelves'),
    showerGlasses: text('shower_glasses'),
    showerSystems: text('shower_systems'),
    floorTiles: text('floor_tiles'),
    wallTiles: text('wall_tiles'),
    showerWallTiles: text('shower_wall_tiles'),
    showerFloorTiles: text('shower_floor_tiles'),
    showerCurbTiles: text('shower_curb_tiles'),
    toiletPaperHolders: text('toilet_paper_holders'),
    toilets: text('toilets'),
    towelBars: text('towel_bars'),
    towelRings: text('towel_rings'),
    tubDoors: text('tub_doors'),
    tubFillers: text('tub_fillers'),
    tubs: text('tubs'),
    vanities: text('vanities'),
    wallpapers: text('wallpapers'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_input_preset_created_at').on(table.createdAt),
    index('idx_input_preset_active')
      .on(table.createdAt)
      .where(sql`deleted_at IS NULL`),
  ],
);

/**
 * strategy: a named reference to a generation output image.
 * Allows feeding a previous generation's output as input to new generations.
 */
export const strategy = pgTable(
  'strategy',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Metadata
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Source: which generation result image this strategy references
    sourceResultId: uuid('source_result_id')
      .notNull()
      .references(() => generationResult.id, { onDelete: 'restrict' }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_strategy_created_at').on(table.createdAt),
    index('idx_strategy_active')
      .on(table.createdAt)
      .where(sql`deleted_at IS NULL`),
    index('idx_strategy_source_result').on(table.sourceResultId),
  ],
);

/**
 * image_selection: standalone draft/workspace table.
 * Persists the current image selections on the generate page
 * so they can be picked up between sessions.
 * Same image columns as generation_input but not tied to a generation.
 */
export const imageSelection = pgTable(
  'image_selection',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Owner (Neon Auth user id)
    userId: text('user_id').notNull(),

    // Scene images (S3 URLs)
    dollhouseView: text('dollhouse_view'),
    realPhoto: text('real_photo'),
    moodBoard: text('mood_board'),

  // Product images (S3 URLs) -- one per category
  faucets: text('faucets'),
  lightings: text('lightings'),
  lvps: text('lvps'),
  mirrors: text('mirrors'),
  paints: text('paints'),
  robeHooks: text('robe_hooks'),
  shelves: text('shelves'),
  showerGlasses: text('shower_glasses'),
  showerSystems: text('shower_systems'),
  floorTiles: text('floor_tiles'),
  wallTiles: text('wall_tiles'),
  showerWallTiles: text('shower_wall_tiles'),
  showerFloorTiles: text('shower_floor_tiles'),
  showerCurbTiles: text('shower_curb_tiles'),
  toiletPaperHolders: text('toilet_paper_holders'),
  toilets: text('toilets'),
  towelBars: text('towel_bars'),
  towelRings: text('towel_rings'),
  tubDoors: text('tub_doors'),
  tubFillers: text('tub_fillers'),
  tubs: text('tubs'),
  vanities: text('vanities'),
  wallpapers: text('wallpapers'),

    // Timestamps
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_image_selection_user').on(table.userId),
    index('idx_image_selection_user').on(table.userId),
  ],
);

// ------------------------------------
// Relations
// ------------------------------------

export const promptVersionRelations = relations(promptVersion, ({ many }) => ({
  generations: many(generation),
}));

export const generationRelations = relations(generation, ({ one, many }) => ({
  promptVersion: one(promptVersion, {
    fields: [generation.promptVersionId],
    references: [promptVersion.id],
  }),
  inputPreset: one(inputPreset, {
    fields: [generation.inputPresetId],
    references: [inputPreset.id],
  }),
  strategy: one(strategy, {
    fields: [generation.strategyId],
    references: [strategy.id],
  }),
  input: one(generationInput, {
    fields: [generation.id],
    references: [generationInput.generationId],
  }),
  results: many(generationResult),
}));

export const generationInputRelations = relations(generationInput, ({ one }) => ({
  generation: one(generation, {
    fields: [generationInput.generationId],
    references: [generation.id],
  }),
}));

export const generationResultRelations = relations(generationResult, ({ one, many }) => ({
  generation: one(generation, {
    fields: [generationResult.generationId],
    references: [generation.id],
  }),
  evaluation: one(resultEvaluation, {
    fields: [generationResult.id],
    references: [resultEvaluation.resultId],
  }),
  strategies: many(strategy),
}));

export const strategyRelations = relations(strategy, ({ one, many }) => ({
  sourceResult: one(generationResult, {
    fields: [strategy.sourceResultId],
    references: [generationResult.id],
  }),
  generations: many(generation),
}));

export const resultEvaluationRelations = relations(resultEvaluation, ({ one }) => ({
  result: one(generationResult, {
    fields: [resultEvaluation.resultId],
    references: [generationResult.id],
  }),
}));

export const inputPresetRelations = relations(inputPreset, ({ many }) => ({
  generations: many(generation),
}));
