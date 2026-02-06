import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createPromptVersionSchema, listPromptVersionsSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const parsed = listPromptVersionsSchema.safeParse(params);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid query parameters', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { page, limit, include_deleted, sort, order } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = include_deleted ? [] : [isNull(promptVersion.deletedAt)];

    const orderBy =
      sort === 'name'
        ? order === 'asc'
          ? asc(promptVersion.name)
          : desc(promptVersion.name)
        : order === 'asc'
          ? asc(promptVersion.createdAt)
          : desc(promptVersion.createdAt);

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(promptVersion)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(promptVersion)
        .where(and(...conditions)),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Fetch generation stats for each prompt version
    const data = await Promise.all(
      rows.map(async (pv) => {
        const stats = await db
          .select({ count: count() })
          .from(generation)
          .where(eq(generation.promptVersionId, pv.id));

        return {
          ...pv,
          stats: {
            generation_count: stats[0]?.count ?? 0,
          },
        };
      }),
    );

    return paginatedResponse(data, { page, limit, total });
  } catch (error) {
    console.error('Error listing prompt versions:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to list prompt versions');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPromptVersionSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', {
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { system_prompt, user_prompt, name, description, ...modelSettings } = parsed.data;

    const [created] = await db
      .insert(promptVersion)
      .values({
        systemPrompt: system_prompt,
        userPrompt: user_prompt,
        name: name ?? null,
        description: description ?? null,
        model: modelSettings.model ?? null,
        outputType: modelSettings.output_type ?? null,
        aspectRatio: modelSettings.aspect_ratio ?? null,
        outputResolution: modelSettings.output_resolution ?? null,
        temperature: modelSettings.temperature?.toString() ?? null,
      })
      .returning();

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error creating prompt version:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create prompt version');
  }
}
