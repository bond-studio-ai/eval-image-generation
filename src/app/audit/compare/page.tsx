import { CompareView } from './compare-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ left?: string; right?: string }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { left, right } = await searchParams;

  if (!left || !right) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-gray-500">
        <p className="text-lg font-medium">Compare Runs</p>
        <p className="mt-1 text-sm">
          Provide <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">?left=&lt;runId&gt;&amp;right=&lt;runId&gt;</code> to compare two runs.
        </p>
      </div>
    );
  }

  return <CompareView leftId={left} rightId={right} />;
}
