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

      {/* Steps */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Steps ({result.steps.length})</h2>
        {result.steps.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No steps defined. Edit this strategy to add steps.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {result.steps.map((step) => (
              <div
                key={step.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center justify-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                      Step {step.stepOrder}
                    </span>
                  </div>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{step.model}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Prompt</p>
                    <p className="mt-0.5 text-gray-900">
                      <Link href={`/prompt-versions/${step.promptVersionId}`} className="text-primary-600 hover:text-primary-500">
                        {step.promptVersion?.name || 'Untitled'}
                      </Link>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Input Preset</p>
                    <p className="mt-0.5 text-gray-900">
                      {step.inputPresetId ? (
                        <Link href={`/input-presets/${step.inputPresetId}`} className="text-primary-600 hover:text-primary-500">
                          {step.inputPreset?.name || 'Untitled'}
                        </Link>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>{step.aspectRatio}</span>
                  <span>{step.outputResolution}</span>
                  {step.temperature && <span>temp: {step.temperature}</span>}
                  {step.useGoogleSearch && <span className="text-blue-600">Google Search</span>}
                </div>
                {(step.dollhouseViewFromStep || step.realPhotoFromStep || step.moodBoardFromStep) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {step.dollhouseViewFromStep && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                        Dollhouse View &larr; Step {step.dollhouseViewFromStep}
                      </span>
                    )}
                    {step.realPhotoFromStep && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                        Real Photo &larr; Step {step.realPhotoFromStep}
                      </span>
                    )}
                    {step.moodBoardFromStep && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20 ring-inset">
                        Mood Board &larr; Step {step.moodBoardFromStep}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
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
