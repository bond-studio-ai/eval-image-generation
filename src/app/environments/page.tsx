import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { EnvironmentsTable } from './environments-table';

export const dynamic = 'force-dynamic';

export default function EnvironmentsPage() {
  return (
    <div>
      <PageHeader
        title="Environments"
        subtitle="Manage remote environments for strategy deployment."
        actions={<PrimaryLinkButton href="/environments/new" icon>New Environment</PrimaryLinkButton>}
      />
      <EnvironmentsTable />
    </div>
  );
}
