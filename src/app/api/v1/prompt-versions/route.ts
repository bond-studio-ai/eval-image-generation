import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { errorResponse, paginatedResponse, successResponse } from '@/lib/api-response';
import { createPromptVersionSchema, listPromptVersionsSchema } from '@/lib/validation';
import { and, asc, count, desc, eq, inArray, isNull } from 'drizzle-orm';
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

    const { page, limit, include_deleted, sort, order, minimal } = parsed.data;
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

    if (minimal) {
      return paginatedResponse(rows, { page, limit, total });
    }

    const ids = rows.map((r) => r.id);
    const countRows =
      ids.length > 0
        ? await db
            .select({
              promptVersionId: generation.promptVersionId,
              count: count(),
            })
            .from(generation)
            .where(inArray(generation.promptVersionId, ids))
            .groupBy(generation.promptVersionId)
        : [];
    const countByPv = Object.fromEntries(countRows.map((r) => [r.promptVersionId, r.count]));

    const data = rows.map((pv) => ({
      ...pv,
      stats: {
        generation_count: countByPv[pv.id] ?? 0,
      },
    }));

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

    const { system_prompt, user_prompt, name, description } = parsed.data;

    const [created] = await db
      .insert(promptVersion)
      .values({
        systemPrompt: system_prompt,
        userPrompt: user_prompt,
        name: name ?? null,
        description: description ?? null,
      })
      .returning();

    return successResponse(created, 201);
  } catch (error) {
    console.error('Error creating prompt version:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create prompt version');
  }
}
