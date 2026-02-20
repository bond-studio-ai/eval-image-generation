import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { db } from '@/db';
import { strategy, strategyRunInputPreset, strategyStep } from '@/db/schema';
import { fetchInputPresets } from '@/lib/queries';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StrategyRunsList } from './runs-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StrategyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const result = await db.query.strategy.findFirst({
    where: eq(strategy.id, id),
    with: {
      steps: {
        orderBy: [strategyStep.stepOrder],
        with: {
          promptVersion: { columns: { id: true, name: true } },
        },
      },
      runs: {
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: 50,
        with: {
          stepResults: {
            columns: { id: true, status: true },
          },
          inputPresets: {
            with: {
              inputPreset: { columns: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const inputPresets = await fetchInputPresets(100);
  const initialRuns = result.runs.map((run) => ({
    id: run.id,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    inputPresetName: run.inputPresets?.[0]?.inputPreset?.name ?? null,
    stepResults: run.stepResults.map((sr) => ({
      id: sr.id,
      status: sr.status,
    })),
  }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/strategies" className="text-sm text-gray-600 hover:text-gray-900">
            &larr; Back to Strategies
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{result.name}</h1>
          {result.description && (
            <p className="mt-1 text-sm text-gray-600">{result.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/strategies/${result.id}/edit`}
            className="bg-primary-600 hover:bg-primary-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Strategy
          </Link>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Execution Flow</h2>
        {result.steps.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No steps defined. Edit this strategy to add steps.</p>
        ) : (
          <div className="mt-4">
            <StrategyFlowDag
              steps={result.steps.map((step): DagStep => ({
                stepOrder: step.stepOrder,
                label: step.name || `Step ${step.stepOrder}`,
                model: step.model,
                aspectRatio: step.aspectRatio,
                outputResolution: step.outputResolution,
                temperature: step.temperature,
                promptName: step.promptVersion?.name,
                dollhouseViewFromStep: step.dollhouseViewFromStep,
                realPhotoFromStep: step.realPhotoFromStep,
                moodBoardFromStep: step.moodBoardFromStep,
                arbitraryImageFromStep: step.arbitraryImageFromStep,
              }))}
            />
          </div>
        )}
      </div>

      {/* Runs */}
      <div className="mt-8">
        <StrategyRunsList strategyId={result.id} initialRuns={initialRuns} inputPresets={inputPresets} />
      </div>
    </div>
  );
}
