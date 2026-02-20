import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
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

    // Product images (S3 URLs) -- multiple per category
    faucets: text('faucets').array().default([]),
    lightings: text('lightings').array().default([]),
    lvps: text('lvps').array().default([]),
    mirrors: text('mirrors').array().default([]),
    paints: text('paints').array().default([]),
    robeHooks: text('robe_hooks').array().default([]),
    shelves: text('shelves').array().default([]),
    showerGlasses: text('shower_glasses').array().default([]),
    showerSystems: text('shower_systems').array().default([]),
    floorTiles: text('floor_tiles').array().default([]),
    wallTiles: text('wall_tiles').array().default([]),
    showerWallTiles: text('shower_wall_tiles').array().default([]),
    showerFloorTiles: text('shower_floor_tiles').array().default([]),
    showerCurbTiles: text('shower_curb_tiles').array().default([]),
    toiletPaperHolders: text('toilet_paper_holders').array().default([]),
    toilets: text('toilets').array().default([]),
    towelBars: text('towel_bars').array().default([]),
    towelRings: text('towel_rings').array().default([]),
    tubDoors: text('tub_doors').array().default([]),
    tubFillers: text('tub_fillers').array().default([]),
    tubs: text('tubs').array().default([]),
    vanities: text('vanities').array().default([]),
    wallpapers: text('wallpapers').array().default([]),
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

    // Product images (S3 URLs) -- multiple per category
    faucets: text('faucets').array().default([]),
    lightings: text('lightings').array().default([]),
    lvps: text('lvps').array().default([]),
    mirrors: text('mirrors').array().default([]),
    paints: text('paints').array().default([]),
    robeHooks: text('robe_hooks').array().default([]),
    shelves: text('shelves').array().default([]),
    showerGlasses: text('shower_glasses').array().default([]),
    showerSystems: text('shower_systems').array().default([]),
    floorTiles: text('floor_tiles').array().default([]),
    wallTiles: text('wall_tiles').array().default([]),
    showerWallTiles: text('shower_wall_tiles').array().default([]),
    showerFloorTiles: text('shower_floor_tiles').array().default([]),
    showerCurbTiles: text('shower_curb_tiles').array().default([]),
    toiletPaperHolders: text('toilet_paper_holders').array().default([]),
    toilets: text('toilets').array().default([]),
    towelBars: text('towel_bars').array().default([]),
    towelRings: text('towel_rings').array().default([]),
    tubDoors: text('tub_doors').array().default([]),
    tubFillers: text('tub_fillers').array().default([]),
    tubs: text('tubs').array().default([]),
    vanities: text('vanities').array().default([]),
    wallpapers: text('wallpapers').array().default([]),

    // Arbitrary image URLs (not tied to a specific attribute)
    // Arbitrary images: optional tag sent to Gemini as label
    arbitraryImages: jsonb('arbitrary_images').$type<{ url: string; tag?: string }[]>().notNull().default([]),

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
 * strategy: a multi-step workflow for chaining generations.
 * Each strategy defines ordered steps where outputs from earlier steps
 * can feed into scene fields of later steps.
 */
export const strategy = pgTable(
  'strategy',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_strategy_created_at').on(table.createdAt),
    index('idx_strategy_active')
      .on(table.createdAt)
      .where(sql`deleted_at IS NULL`),
  ],
);

/**
 * strategy_step: one step in a strategy workflow.
 * References a prompt; per-step model settings and which run preset fields to include.
 * Input presets are selected at run time, not on the step.
 */
export const strategyStep = pgTable(
  'strategy_step',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyId: uuid('strategy_id')
      .notNull()
      .references(() => strategy.id, { onDelete: 'cascade' }),
    stepOrder: integer('step_order').notNull(),
    name: varchar('name', { length: 255 }),

    promptVersionId: uuid('prompt_version_id')
      .notNull()
      .references(() => promptVersion.id, { onDelete: 'restrict' }),

    // Per-step model settings
    model: varchar('model', { length: 255 }).notNull().default('gemini-2.5-flash-image'),
    aspectRatio: varchar('aspect_ratio', { length: 20 }).notNull().default('1:1'),
    outputResolution: varchar('output_resolution', { length: 20 }).notNull().default('1K'),
    temperature: decimal('temperature', { precision: 3, scale: 2 }).notNull().default('1.00'),
    useGoogleSearch: boolean('use_google_search').notNull().default(false),
    tagImages: boolean('tag_images').notNull().default(true),

    // Scene field overrides: step number (1-indexed) whose output replaces this field
    dollhouseViewFromStep: integer('dollhouse_view_from_step'),
    realPhotoFromStep: integer('real_photo_from_step'),
    moodBoardFromStep: integer('mood_board_from_step'),

    // What to include from the run's merged input presets
    includeDollhouse: boolean('include_dollhouse').notNull().default(true),
    includeRealPhoto: boolean('include_real_photo').notNull().default(true),
    includeMoodBoard: boolean('include_mood_board').notNull().default(true),
    includeProductCategories: jsonb('include_product_categories').$type<string[]>().notNull().default([]),

    // For steps 2+: include output from a previous step as an extra image (step order 1-indexed)
    arbitraryImageFromStep: integer('arbitrary_image_from_step'),
  },
  (table) => [
    index('idx_strategy_step_strategy').on(table.strategyId),
    unique('uq_strategy_step_order').on(table.strategyId, table.stepOrder),
  ],
);

/**
 * strategy_run: an execution of a strategy workflow.
 * Input presets are selected when starting the run (see strategy_run_input_preset).
 */
export const strategyRun = pgTable(
  'strategy_run',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyId: uuid('strategy_id')
      .notNull()
      .references(() => strategy.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_strategy_run_strategy').on(table.strategyId),
    index('idx_strategy_run_created_at').on(table.createdAt),
  ],
);

/**
 * strategy_run_input_preset: input presets selected for a run (ordered).
 * Each step pulls from this merged set based on its include flags.
 */
export const strategyRunInputPreset = pgTable(
  'strategy_run_input_preset',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyRunId: uuid('strategy_run_id')
      .notNull()
      .references(() => strategyRun.id, { onDelete: 'cascade' }),
    inputPresetId: uuid('input_preset_id')
      .notNull()
      .references(() => inputPreset.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(), // 0, 1, 2... for merge order (first non-null wins per key)
  },
  (table) => [
    index('idx_run_input_preset_run').on(table.strategyRunId),
  ],
);

/**
 * strategy_step_result: result of executing one step within a strategy run.
 */
export const strategyStepResult = pgTable(
  'strategy_step_result',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    strategyRunId: uuid('strategy_run_id')
      .notNull()
      .references(() => strategyRun.id, { onDelete: 'cascade' }),
    strategyStepId: uuid('strategy_step_id')
      .notNull()
      .references(() => strategyStep.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id')
      .references(() => generation.id, { onDelete: 'set null' }),
    outputUrl: text('output_url'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    error: text('error'),
    executionTime: integer('execution_time'),
  },
  (table) => [
    index('idx_step_result_run').on(table.strategyRunId),
    index('idx_step_result_step').on(table.strategyStepId),
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

    // Product images (S3 URLs) -- multiple per category
    faucets: text('faucets').array().default([]),
    lightings: text('lightings').array().default([]),
    lvps: text('lvps').array().default([]),
    mirrors: text('mirrors').array().default([]),
    paints: text('paints').array().default([]),
    robeHooks: text('robe_hooks').array().default([]),
    shelves: text('shelves').array().default([]),
    showerGlasses: text('shower_glasses').array().default([]),
    showerSystems: text('shower_systems').array().default([]),
    floorTiles: text('floor_tiles').array().default([]),
    wallTiles: text('wall_tiles').array().default([]),
    showerWallTiles: text('shower_wall_tiles').array().default([]),
    showerFloorTiles: text('shower_floor_tiles').array().default([]),
    showerCurbTiles: text('shower_curb_tiles').array().default([]),
    toiletPaperHolders: text('toilet_paper_holders').array().default([]),
    toilets: text('toilets').array().default([]),
    towelBars: text('towel_bars').array().default([]),
    towelRings: text('towel_rings').array().default([]),
    tubDoors: text('tub_doors').array().default([]),
    tubFillers: text('tub_fillers').array().default([]),
    tubs: text('tubs').array().default([]),
    vanities: text('vanities').array().default([]),
    wallpapers: text('wallpapers').array().default([]),

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

export const generationResultRelations = relations(generationResult, ({ one }) => ({
  generation: one(generation, {
    fields: [generationResult.generationId],
    references: [generation.id],
  }),
  evaluation: one(resultEvaluation, {
    fields: [generationResult.id],
    references: [resultEvaluation.resultId],
  }),
}));

export const strategyRelations = relations(strategy, ({ many }) => ({
  steps: many(strategyStep),
  runs: many(strategyRun),
}));

export const strategyStepRelations = relations(strategyStep, ({ one }) => ({
  strategy: one(strategy, {
    fields: [strategyStep.strategyId],
    references: [strategy.id],
  }),
  promptVersion: one(promptVersion, {
    fields: [strategyStep.promptVersionId],
    references: [promptVersion.id],
  }),
}));

export const strategyRunRelations = relations(strategyRun, ({ one, many }) => ({
  strategy: one(strategy, {
    fields: [strategyRun.strategyId],
    references: [strategy.id],
  }),
  stepResults: many(strategyStepResult),
  inputPresets: many(strategyRunInputPreset),
}));

export const strategyRunInputPresetRelations = relations(strategyRunInputPreset, ({ one }) => ({
  run: one(strategyRun, {
    fields: [strategyRunInputPreset.strategyRunId],
    references: [strategyRun.id],
  }),
  inputPreset: one(inputPreset, {
    fields: [strategyRunInputPreset.inputPresetId],
    references: [inputPreset.id],
  }),
}));

export const strategyStepResultRelations = relations(strategyStepResult, ({ one }) => ({
  run: one(strategyRun, {
    fields: [strategyStepResult.strategyRunId],
    references: [strategyRun.id],
  }),
  step: one(strategyStep, {
    fields: [strategyStepResult.strategyStepId],
    references: [strategyStep.id],
  }),
  generation: one(generation, {
    fields: [strategyStepResult.generationId],
    references: [generation.id],
  }),
}));

export const resultEvaluationRelations = relations(resultEvaluation, ({ one }) => ({
  result: one(generationResult, {
    fields: [resultEvaluation.resultId],
    references: [generationResult.id],
  }),
}));

export const inputPresetRelations = relations(inputPreset, ({ many }) => ({
  generations: many(generation),
  strategyRunPresets: many(strategyRunInputPreset),
}));
