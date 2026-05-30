import type { RunData } from './types';

const SOURCE_LABELS: Record<string, string> = {
  preset: 'Preset Run',
  raw_input: 'Real Input',
  batch: 'Batch Run',
  retry: 'Preset Run',
};

export function RunHeader({ run, label }: { run: RunData; label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{run.strategy.name}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${run.status === 'completed' ? 'bg-green-100 text-green-700' : run.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
        >
          {run.status}
        </span>
        {run.source && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            {SOURCE_LABELS[run.source] ?? run.source}
          </span>
        )}
        {run.judgeScore != null && (
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            Judge: {run.judgeScore}
          </span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-gray-500">{new Date(run.createdAt).toLocaleString()}</p>
      <p className="mt-0.5 font-mono text-[10px] text-gray-400">{run.id}</p>
    </div>
  );
}
