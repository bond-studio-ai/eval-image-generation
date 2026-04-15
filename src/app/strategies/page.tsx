import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { StrategiesTable } from './strategies-table';

export const dynamic = 'force-dynamic';

export default function StrategiesPage() {
  return (
    <div>
      <PageHeader
        title="Strategies"
        subtitle="Multi-step workflows that chain generations together."
        actions={<PrimaryLinkButton href="/strategies/new" icon>New Strategy</PrimaryLinkButton>}
      />
      <StrategiesTable />
    </div>
  );
}
