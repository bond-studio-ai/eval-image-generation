import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { fetchStrategies } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StrategiesPage() {
  const strategies = await fetchStrategies(100);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Strategies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Multi-step workflows that chain generations together.
          </p>
        </div>
        <Link
          href="/strategies/new"
          className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Strategy
        </Link>
      </div>

      {strategies.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No strategies"
            description="Create a strategy to define a multi-step generation workflow."
          />
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Runs</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {strategies.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/strategies/${s.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                      {s.name}
                    </Link>
                    {s.description && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{s.description}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {s.stepCount} step{s.stepCount !== 1 ? 's' : ''}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                    {s.runCount} run{s.runCount !== 1 ? 's' : ''}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
