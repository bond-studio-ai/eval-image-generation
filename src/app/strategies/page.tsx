import { EmptyState } from '@/components/empty-state';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { fetchStrategies } from '@/lib/service-client';
import { StrategiesTable } from './strategies-table';

export const dynamic = 'force-dynamic';

export default async function StrategiesPage() {
  const strategies = await fetchStrategies(100);

  return (
    <div>
      <PageHeader
        title="Strategies"
        subtitle="Multi-step workflows that chain generations together."
        actions={<PrimaryLinkButton href="/strategies/new" icon>New Strategy</PrimaryLinkButton>}
      />

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
