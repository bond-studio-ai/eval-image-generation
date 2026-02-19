import { EmptyState } from '@/components/empty-state';
import { PromptVersionsList, type PromptVersionRow } from '@/components/prompt-versions-list';
import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ page?: string; include_deleted?: string }>;
}

export default async function PromptVersionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const includeDeleted = params.include_deleted === 'true';
  const offset = (page - 1) * limit;

  const conditions = includeDeleted ? [] : [isNull(promptVersion.deletedAt)];

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(promptVersion)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(promptVersion.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(promptVersion)
      .where(conditions.length > 0 ? and(...conditions) : undefined),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  const data: PromptVersionRow[] = await Promise.all(
    rows.map(async (pv) => {
      const genCount = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.promptVersionId, pv.id));
      return {
        id: pv.id,
        name: pv.name,
        userPrompt: pv.userPrompt,
        model: pv.model,
        generationCount: genCount[0]?.count ?? 0,
        createdAt: pv.createdAt.toISOString(),
        deletedAt: pv.deletedAt?.toISOString() ?? null,
      };
    }),
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Versions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage versioned prompts for image generation.
          </p>
        </div>
        <Link
          href="/prompt-versions/new"
          className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
        >
          New Prompt Version
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No prompt versions"
            description="Get started by creating your first prompt version."
            action={
              <Link
                href="/prompt-versions/new"
                className="bg-primary-600 hover:bg-primary-700 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-xs"
              >
                Create Prompt Version
              </Link>
            }
          />
        </div>
      ) : (
        <PromptVersionsList data={data} page={page} totalPages={totalPages} total={total} />
      )}
    </div>
  );
}
