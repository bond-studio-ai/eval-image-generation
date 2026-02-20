import { relations, sql } from 'drizzle-orm';
import {
  decimal,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const generationRating = pgEnum('generation_rating', ['FAILED', 'GOOD']);
export const productCategory = pgEnum('product_category', [
  'FAUCETS',
  'LIGHTINGS',
  'LVPS',
  'MIRRORS',
  'PAINTS',
  'ROBE_HOOKS',
  'SHELVES',
  'SHOWER_GLASSES',
  'SHOWER_SYSTEMS',
  'FLOOR_TILES',
  'WALL_TILES',
  'SHOWER_WALL_TILES',
  'SHOWER_FLOOR_TILES',
  'SHOWER_CURB_TILES',
  'TOILET_PAPER_HOLDERS',
  'TOILETS',
  'TOWEL_BARS',
  'TOWEL_RINGS',
  'TUB_DOORS',
  'TUB_FILLERS',
  'TUBS',
  'VANITIES',
  'WALLPAPERS',
]);
export const renovationType = pgEnum('renovation_type', ['FULL', 'PARTIAL']);
export const sceneImageType = pgEnum('scene_image_type', [
  'DOLLHOUSE_VIEW',
  'REAL_PHOTO',
  'MOOD_BOARD',
]);

export const generationInput = pgTable(
  'generation_input',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    generationId: uuid('generation_id').notNull(),
    dollhouseView: text('dollhouse_view'),
    realPhoto: text('real_photo'),
    faucets: text(),
    lightings: text(),
    lvps: text(),
    mirrors: text(),
    paints: text(),
    robeHooks: text('robe_hooks'),
    shelves: text(),
    showerGlasses: text('shower_glasses'),
    showerSystems: text('shower_systems'),
    floorTiles: text('floor_tiles'),
    wallTiles: text('wall_tiles'),
    showerWallTiles: text('shower_wall_tiles'),
    showerFloorTiles: text('shower_floor_tiles'),
    showerCurbTiles: text('shower_curb_tiles'),
    toiletPaperHolders: text('toilet_paper_holders'),
    toilets: text(),
    towelBars: text('towel_bars'),
    towelRings: text('towel_rings'),
    tubDoors: text('tub_doors'),
    tubFillers: text('tub_fillers'),
    tubs: text(),
    vanities: text(),
    wallpapers: text(),
    moodBoard: text('mood_board'),
  },
  (table) => [
    foreignKey({
      columns: [table.generationId],
      foreignColumns: [generation.id],
      name: 'generation_input_generation_id_generation_id_fk',
    }).onDelete('cascade'),
  ],
);

export const generationStepExecution = pgTable(
  'generation_step_execution',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    generationId: uuid('generation_id').notNull(),
    stepOrder: integer('step_order').notNull(),

    // snapshot prompt
    systemPrompt: text('system_prompt').notNull(),
    userPrompt: text('user_prompt').notNull(),

    // snapshot model config
    modelName: varchar('model_name', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),

    temperature: numeric('temperature', { precision: 3, scale: 2 }),
    outputType: varchar('output_type', { length: 50 }),
    aspectRatio: varchar('aspect_ratio', { length: 20 }),
    outputResolution: varchar('output_resolution', { length: 20 }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.generationId],
      foreignColumns: [generation.id],
      name: 'generation_step_execution_generation_id_fk',
    }).onDelete('cascade'),

    unique('uq_generation_step_execution_order').on(table.generationId, table.stepOrder),
  ],
);

export const generation = pgTable(
  'generation',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    promptVersionId: uuid('prompt_version_id').notNull(),
    notes: text(),
    executionTime: integer('execution_time'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    sceneAccuracyRating: generationRating('scene_accuracy_rating'),
    productAccuracyRating: generationRating('product_accuracy_rating'),
    inputPresetId: uuid('input_preset_id'),
    strategyId: uuid('strategy_id'),
    modelId: uuid('model_id'),
    renovationType: renovationType('renovation_type'),
  },
  (table) => [
    foreignKey({
      columns: [table.promptVersionId],
      foreignColumns: [promptVersion.id],
      name: 'generation_prompt_version_id_prompt_version_id_fk',
    }),
  ],
);

export const promptVersion = pgTable('prompt_version', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  systemPrompt: text('system_prompt').notNull(),
  userPrompt: text('user_prompt').notNull(),
  name: varchar({ length: 255 }),
  description: text(),
  model: varchar({ length: 255 }),
  outputType: varchar('output_type', { length: 50 }),
  aspectRatio: varchar('aspect_ratio', { length: 20 }),
  outputResolution: varchar('output_resolution', { length: 20 }),
  temperature: numeric({ precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const generationInputV2 = pgTable('generation_input_v2', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  generationId: uuid('generation_id'),
});

export const generationResult = pgTable(
  'generation_result',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    generationId: uuid('generation_id').notNull(),
    url: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.generationId],
      foreignColumns: [generation.id],
      name: 'generation_result_generation_id_generation_id_fk',
    }).onDelete('cascade'),
  ],
);

export const resultEvaluation = pgTable(
  'result_evaluation',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    resultId: uuid('result_id').notNull(),
    productAccuracy: text('product_accuracy'),
    sceneAccuracyIssues: text('scene_accuracy_issues'),
    sceneAccuracyNotes: text('scene_accuracy_notes'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.resultId],
      foreignColumns: [generationResult.id],
      name: 'result_evaluation_result_id_generation_result_id_fk',
    }).onDelete('cascade'),
  ],
);

export const imagePreset = pgTable('image_preset', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 255 }),
  renovationType: renovationType('renovation_type'),
  userId: text('user_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const modelV2 = pgTable('model_v2', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  provider: varchar({ length: 255 }).notNull(),
  maxInputTokens: integer('max_input_tokens'),
  maxOutputTokens: integer('max_output_tokens'),
  costPerInputToken: numeric('cost_per_input_token', { precision: 10, scale: 6 }),
  costPerOutputToken: numeric('cost_per_output_token', { precision: 10, scale: 6 }),
  isActive: integer('is_active').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const presetProductImage = pgTable('preset_product_image', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  presetId: uuid('preset_id'),
  category: varchar({ length: 100 }),
  productId: uuid('product_id'),
  imageUrl: text('image_url'),
});

export const presetSceneImage = pgTable('preset_scene_image', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  presetId: uuid('preset_id'),
  type: varchar({ length: 50 }),
  url: text(),
});

export const strategyStep = pgTable('strategy_step', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  strategyId: uuid('strategy_id'),
  order: integer(),
  promptVersionId: uuid('prompt_version_id'),
  modelId: uuid('model_id'),
  temperature: numeric({ precision: 3, scale: 2 }),
  outputType: varchar('output_type', { length: 50 }),
  aspectRatio: varchar('aspect_ratio', { length: 20 }),
  outputResolution: varchar('output_resolution', { length: 20 }),
});

export const strategyV2 = pgTable('strategy_v2', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  renovationType: renovationType('renovation_type'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
});

export const imageSelection = pgTable(
  'image_selection',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    dollhouseView: text('dollhouse_view'),
    realPhoto: text('real_photo'),
    faucets: text(),
    lightings: text(),
    lvps: text(),
    mirrors: text(),
    paints: text(),
    robeHooks: text('robe_hooks'),
    shelves: text(),
    showerGlasses: text('shower_glasses'),
    showerSystems: text('shower_systems'),
    floorTiles: text('floor_tiles'),
    wallTiles: text('wall_tiles'),
    showerWallTiles: text('shower_wall_tiles'),
    showerFloorTiles: text('shower_floor_tiles'),
    showerCurbTiles: text('shower_curb_tiles'),
    toiletPaperHolders: text('toilet_paper_holders'),
    toilets: text(),
    towelBars: text('towel_bars'),
    towelRings: text('towel_rings'),
    tubDoors: text('tub_doors'),
    tubFillers: text('tub_fillers'),
    tubs: text(),
    vanities: text(),
    wallpapers: text(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    userId: text('user_id').notNull(),
    moodBoard: text('mood_board'),
  },
  (table) => [
    index('idx_image_selection_user').using('btree', table.userId.asc().nullsLast().op('text_ops')),
    unique('uq_image_selection_user').on(table.userId),
  ],
);

export const generationProductImage = pgTable(
  'generation_product_image',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    generationInputId: uuid('generation_input_id').notNull(),
    category: productCategory().notNull(),
    imageUrl: text('image_url').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.generationInputId],
      foreignColumns: [generationInput.id],
      name: 'generation_product_image_generation_input_id_generation_input_i',
    }).onDelete('cascade'),
  ],
);

export const generationSceneImage = pgTable(
  'generation_scene_image',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    generationInputId: uuid('generation_input_id').notNull(),
    type: sceneImageType().notNull(),
    url: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.generationInputId],
      foreignColumns: [generationInput.id],
      name: 'generation_scene_image_generation_input_id_generation_input_id_',
    }).onDelete('cascade'),
  ],
);

export const generationInputRelations = relations(generationInput, ({ one, many }) => ({
  generation: one(generation, {
    fields: [generationInput.generationId],
    references: [generation.id],
  }),
  generationProductImages: many(generationProductImage),
  generationSceneImages: many(generationSceneImage),
}));

export const generationRelations = relations(generation, ({ one, many }) => ({
  generationInputs: many(generationInput),
  promptVersion: one(promptVersion, {
    fields: [generation.promptVersionId],
    references: [promptVersion.id],
  }),
  generationResults: many(generationResult),
  stepExecutions: many(generationStepExecution),
}));

export const promptVersionRelations = relations(promptVersion, ({ many }) => ({
  generations: many(generation),
}));

export const generationResultRelations = relations(generationResult, ({ one, many }) => ({
  generation: one(generation, {
    fields: [generationResult.generationId],
    references: [generation.id],
  }),
  resultEvaluations: many(resultEvaluation),
}));

export const resultEvaluationRelations = relations(resultEvaluation, ({ one }) => ({
  generationResult: one(generationResult, {
    fields: [resultEvaluation.resultId],
    references: [generationResult.id],
  }),
}));

export const generationProductImageRelations = relations(generationProductImage, ({ one }) => ({
  generationInput: one(generationInput, {
    fields: [generationProductImage.generationInputId],
    references: [generationInput.id],
  }),
}));

export const generationSceneImageRelations = relations(generationSceneImage, ({ one }) => ({
  generationInput: one(generationInput, {
    fields: [generationSceneImage.generationInputId],
    references: [generationInput.id],
  }),
}));

export const generationStepExecutionRelations = relations(generationStepExecution, ({ one }) => ({
  generation: one(generation, {
    fields: [generationStepExecution.generationId],
    references: [generation.id],
  }),
}));
