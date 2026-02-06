import { db } from '@/db';
import {
  generation,
  generationImageInput,
  generationImageOutput,
  promptVersion,
} from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createGenerationSchema, listGenerationsSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listGenerationsSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, prompt_version_id, rating, unrated, from, to, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (prompt_version_id) {
      conditions.push(eq(generation.promptVersionId, prompt_version_id));
    }
    if (rating) {
      conditions.push(eq(generation.resultRating, rating));
    }
    if (unrated) {
      conditions.push(isNull(generation.resultRating));
    }
    if (from) {
      conditions.push(gte(generation.createdAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(generation.createdAt, new Date(to)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy =
      sort === 'rating'
        ? order === 'asc'
          ? asc(generation.resultRating)
          : desc(generation.resultRating)
        : order === 'asc'
          ? asc(generation.createdAt)
          : desc(generation.createdAt);

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: generation.id,
          promptVersionId: generation.promptVersionId,
          promptName: promptVersion.name,
          promptPreview: promptVersion.userPrompt,
          resultRating: generation.resultRating,
          notes: generation.notes,
          executionTime: generation.executionTime,
          createdAt: generation.createdAt,
        })
        .from(generation)
        .innerJoin(promptVersion, eq(promptVersion.id, generation.promptVersionId))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(generation).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Fetch image counts
    const data = await Promise.all(
      rows.map(async (row) => {
        const [inputCount, outputCount] = await Promise.all([
          db
            .select({ count: count() })
            .from(generationImageInput)
            .where(eq(generationImageInput.generationId, row.id)),
          db
            .select({ count: count() })
            .from(generationImageOutput)
            .where(eq(generationImageOutput.generationId, row.id)),
        ]);

        return {
          ...row,
          prompt_preview:
            row.promptPreview && row.promptPreview.length > 100
              ? row.promptPreview.slice(0, 100) + '...'
              : row.promptPreview,
          input_image_count: inputCount[0]?.count ?? 0,
          output_image_count: outputCount[0]?.count ?? 0,
        };
      }),
    );

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing generations:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list generations');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { prompt_version_id, input_images, output_images, notes, execution_time } = parsed.data;

    // Verify prompt version exists
    const pv = await db.query.promptVersion.findFirst({
      where: eq(promptVersion.id, prompt_version_id),
    });

    if (!pv) {
      return errorResponse('NOT_FOUND', 'Prompt version not found');
    }

    // Create generation
    const [created] = await db
      .insert(generation)
      .values({
        promptVersionId: prompt_version_id,
        notes: notes ?? null,
        executionTime: execution_time ?? null,
      })
      .returning();

    // Insert input images
    if (input_images && input_images.length > 0) {
      await db.insert(generationImageInput).values(
        input_images.map((img) => ({
          generationId: created.id,
          url: img.url,
        })),
      );
    }

    // Insert output images
    if (output_images && output_images.length > 0) {
      await db.insert(generationImageOutput).values(
        output_images.map((img) => ({
          generationId: created.id,
          url: img.url,
        })),
      );
    }

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error creating generation:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create generation');
  }
}
