import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
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

  // Fetch generation counts
  const data = await Promise.all(
    rows.map(async (pv) => {
      const genCount = await db
        .select({ count: count() })
        .from(generation)
        .where(eq(generation.promptVersionId, pv.id));
      return { ...pv, generationCount: genCount[0]?.count ?? 0 };
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
        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Generations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((pv) => (
                <tr key={pv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/prompt-versions/${pv.id}`}
                      className="hover:text-primary-600 text-sm font-medium text-gray-900"
                    >
                      {pv.name || 'Untitled'}
                    </Link>
                    <p className="mt-1 max-w-xs truncate text-xs text-gray-600">{pv.userPrompt}</p>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {pv.model || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {pv.generationCount}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700">
                    {new Date(pv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {pv.deletedAt ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-600/20 ring-inset">
                        Deleted
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} />
        </div>
      )}
    </div>
  );
}
