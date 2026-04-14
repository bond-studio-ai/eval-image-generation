import { EmptyState } from '@/components/empty-state';
import { PageHeader, PrimaryLinkButton } from '@/components/page-header';
import { fetchEnvironments } from '@/lib/service-client';
import { EnvironmentsTable } from './environments-table';

export const dynamic = 'force-dynamic';

export default async function EnvironmentsPage() {
  const environments = await fetchEnvironments();

  return (
    <div>
      <PageHeader
        title="Environments"
        subtitle="Manage remote environments for strategy deployment."
        actions={<PrimaryLinkButton href="/environments/new" icon>New Environment</PrimaryLinkButton>}
      />

      {environments.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No environments"
            description="Get started by creating your first environment."
            action={<PrimaryLinkButton href="/environments/new" icon>Create Environment</PrimaryLinkButton>}
          />
        </div>
      ) : (
        <EnvironmentsTable environments={environments} />
      )}
    </div>
  );
}
