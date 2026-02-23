'use client';

import { useState } from 'react';
import { IndividualExecutionsTab } from './individual-tab';
import { MatrixTab } from './matrix-tab';
import { BatchRunsTab } from './batch-tab';

type Tab = 'individual' | 'matrix' | 'batch';

export function ExecutionsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('individual');

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'individual'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Individual Executions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'matrix'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'batch'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Batch Runs
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'individual' && <IndividualExecutionsTab />}
        {activeTab === 'matrix' && <MatrixTab />}
        {activeTab === 'batch' && <BatchRunsTab />}
      </div>
    </div>
  );
}
