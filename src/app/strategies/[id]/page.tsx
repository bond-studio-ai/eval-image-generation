import { StrategyFlowDag, type DagStep } from '@/components/strategy-flow-dag';
import { db } from '@/db';
import { strategy, strategyStep } from '@/db/schema';
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
          inputPreset: { columns: { id: true, name: true } },
        },
      },
      runs: {
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: 20,
        with: {
          stepResults: {
            columns: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!result) {
    notFound();
  }

  const initialRuns = result.runs.map((run) => ({
    id: run.id,
    status: run.status,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Edit
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
                inputPresetName: step.inputPreset?.name,
                dollhouseViewFromStep: step.dollhouseViewFromStep,
                realPhotoFromStep: step.realPhotoFromStep,
                moodBoardFromStep: step.moodBoardFromStep,
              }))}
            />
          </div>
        )}
      </div>

      {/* Runs */}
      <div className="mt-8">
        <StrategyRunsList strategyId={result.id} initialRuns={initialRuns} />
      </div>
    </div>
  );
}
