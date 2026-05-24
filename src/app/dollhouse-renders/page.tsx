import { PageHeader } from '@/components/page-header';
import { LinkButton, PlusIcon } from '@/components/ui';
import { DollhouseRendersTable } from './dollhouse-renders-table';

export const dynamic = 'force-dynamic';

export default function DollhouseRendersPage() {
  return (
    <div>
      <PageHeader
        title="Dollhouse Renders"
        subtitle="Browse standalone dollhouse renders and submit new ones for a project."
        actions={
          <LinkButton
            href="/dollhouse-renders/new"
            variant="primary"
            iconLeft={<PlusIcon className="h-4 w-4" />}
          >
            New Render
          </LinkButton>
        }
      />
      <DollhouseRendersTable />
    </div>
  );
}
