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
  'POOR',
  'ACCEPTABLE',
  'GOOD',
  'EXCELLENT',
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

    // Rating
    resultRating: generationRatingEnum('result_rating'),

    // Additional data
    notes: text('notes'),
    executionTime: integer('execution_time'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_generation_prompt_version').on(table.promptVersionId),
    index('idx_generation_created_at').on(table.createdAt),
    index('idx_generation_rating')
      .on(table.resultRating)
      .where(sql`result_rating IS NOT NULL`),
    index('idx_generation_unrated')
      .on(table.createdAt)
      .where(sql`result_rating IS NULL`),
  ],
);

export const generationImageOutput = pgTable(
  'generation_image_output',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),

    // Image data
    url: text('url').notNull(),
  },
  (table) => [index('idx_output_generation').on(table.generationId)],
);

export const generationImageInput = pgTable(
  'generation_image_input',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generation.id, { onDelete: 'cascade' }),

    // Image data
    url: text('url').notNull(),
  },
  (table) => [index('idx_input_generation').on(table.generationId)],
);

export const imageEvaluation = pgTable(
  'image_evaluation',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    outputImageId: uuid('output_image_id')
      .notNull()
      .references(() => generationImageOutput.id, { onDelete: 'cascade' }),

    // Product Accuracy
    productAccuracyCategories: text('product_accuracy_categories'), // JSON array of inaccurate categories
    productAccuracyIssues: text('product_accuracy_issues'), // JSON array of selected issues
    productAccuracyNotes: text('product_accuracy_notes'),

    // Scene Accuracy
    sceneAccuracyIssues: text('scene_accuracy_issues'), // JSON array of selected issues
    sceneAccuracyNotes: text('scene_accuracy_notes'),

    // Integration Accuracy
    integrationAccuracyIssues: text('integration_accuracy_issues'), // JSON array of selected issues
    integrationAccuracyNotes: text('integration_accuracy_notes'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_image_evaluation_output').on(table.outputImageId),
    index('idx_image_evaluation_output').on(table.outputImageId),
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
  inputImages: many(generationImageInput),
  outputImages: many(generationImageOutput),
}));

export const generationImageOutputRelations = relations(generationImageOutput, ({ one }) => ({
  generation: one(generation, {
    fields: [generationImageOutput.generationId],
    references: [generation.id],
  }),
  evaluation: one(imageEvaluation, {
    fields: [generationImageOutput.id],
    references: [imageEvaluation.outputImageId],
  }),
}));

export const generationImageInputRelations = relations(generationImageInput, ({ one }) => ({
  generation: one(generation, {
    fields: [generationImageInput.generationId],
    references: [generation.id],
  }),
}));

export const imageEvaluationRelations = relations(imageEvaluation, ({ one }) => ({
  outputImage: one(generationImageOutput, {
    fields: [imageEvaluation.outputImageId],
    references: [generationImageOutput.id],
  }),
}));
