'use client';

import { PageHeader } from '@/components/page-header';
import { ScopeToggle } from '@/components/scope-toggle';
import { Spinner } from '@/components/ui/spinner';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { ExecutionsRunButton } from './executions-run-button';

function ExecutionsPageHeaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';
  const handleRunCreated = useCallback(() => router.refresh(), [router]);

  return (
    <PageHeader
      title="Runs"
      subtitle={
        source === 'benchmark'
          ? 'Browse benchmark generations and compare benchmark results.'
          : 'Run strategies and browse generated images.'
      }
      actions={
        <>
          <ScopeToggle />
          <ExecutionsRunButton onRunCreated={handleRunCreated} />
        </>
      }
    />
  );
}

export function ExecutionsPageHeader() {
  return (
    <div className="mb-6">
      <Suspense fallback={<Spinner />}>
        <ExecutionsPageHeaderInner />
      </Suspense>
    </div>
  );
}
