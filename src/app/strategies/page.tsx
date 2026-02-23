import { EmptyState } from '@/components/empty-state';
import { fetchStrategies } from '@/lib/queries';
import Link from 'next/link';
import { StrategiesTable } from './strategies-table';

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
        <StrategiesTable strategies={strategies} />
      )}
    </div>
  );
}
