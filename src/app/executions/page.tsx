import { ExecutionsTabs } from './executions-tabs';

export const dynamic = 'force-dynamic';

export default function ExecutionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
        <p className="mt-1 text-sm text-gray-600">
          View runs and matrix across all strategies.
        </p>
      </div>
      <ExecutionsTabs />
    </div>
  );
}
