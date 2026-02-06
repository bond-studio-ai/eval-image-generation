import { RatingBadge } from '@/components/rating-badge';
import { db } from '@/db';
import { generation, promptVersion } from '@/db/schema';
import { count, isNull } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [promptCount, generationCount, unratedCount, recentGenerations] = await Promise.all([
    db.select({ count: count() }).from(promptVersion).where(isNull(promptVersion.deletedAt)),
    db.select({ count: count() }).from(generation),
    db.select({ count: count() }).from(generation).where(isNull(generation.resultRating)),
    db.query.generation.findMany({
      orderBy: (g, { desc }) => [desc(g.createdAt)],
      limit: 5,
      with: {
        promptVersion: { columns: { name: true } },
      },
    }),
  ]);

  return {
    promptCount: promptCount[0]?.count ?? 0,
    generationCount: generationCount[0]?.count ?? 0,
    unratedCount: unratedCount[0]?.count ?? 0,
    recentGenerations,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      label: 'Active Prompts',
      value: stats.promptCount,
      href: '/prompt-versions',
      color: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Total Generations',
      value: stats.generationCount,
      href: '/generations',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Unrated',
      value: stats.unratedCount,
      href: '/generations?unrated=true',
      color: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overview of your AI image generation testing pipeline.
          </p>
        </div>
        <Link
          href="/generate"
          className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          Generate Image
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color.split(' ')[1]}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Recent Generations */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Generations</h2>
          <Link
            href="/generations"
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Prompt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {stats.recentGenerations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-600">
                    No generations yet. Create a prompt version to get started.
                  </td>
                </tr>
              ) : (
                stats.recentGenerations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                      <Link href={`/generations/${gen.id}`} className="hover:text-primary-600">
                        {gen.promptVersion?.name || 'Untitled'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <RatingBadge rating={gen.resultRating} />
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
                      {new Date(gen.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
