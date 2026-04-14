'use client';

import { PageHeader } from '@/components/page-header';
import { ScopeToggle } from '@/components/scope-toggle';
import { ExecutionsRunButton } from './executions-run-button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function ExecutionsPageHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') === 'benchmark' ? 'benchmark' : 'default';
  const handleRunCreated = useCallback(() => router.refresh(), [router]);

  return (
    <div className="mb-6">
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
    </div>
  );
}
