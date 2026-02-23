import { ExecutionsList } from './executions-list';

export const dynamic = 'force-dynamic';

export default function ExecutionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
        <p className="mt-1 text-sm text-gray-600">
          All strategy runs across all strategies.
        </p>
      </div>
      <ExecutionsList />
    </div>
  );
}
