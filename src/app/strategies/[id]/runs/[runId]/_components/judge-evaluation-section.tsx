import { RunJudgeEvaluationsSection } from '@/components/run-judge-evaluations-section';
import { AuditImageGrid } from './audit';
import { SectionToggle } from './shared';
import type { RunData } from './types';

export function JudgeEvaluationSection({
  data,
  open,
  onToggle,
}: {
  data: RunData;
  open: boolean;
  onToggle: () => void;
}) {
  const hasJudgeInfo =
    data.judgeResults.length > 0 ||
    data.judgeReasoning ||
    data.judgeSystemPrompt ||
    data.judgeUserPrompt;

  if (!hasJudgeInfo) return null;

  return (
    <SectionToggle
      title="Judge Evaluation"
      open={open}
      onToggle={onToggle}
      count={data.judgeResults.length || undefined}
      badge={
        data.judgeScore != null && data.judgeScore > 0 ? (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.isJudgeSelected ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
          >
            Score: {data.judgeScore}
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4 p-4">
        {/* Per-judge evaluations */}
        {data.judgeResults.length > 0 && (
          <RunJudgeEvaluationsSection judgeResults={data.judgeResults} />
        )}

        {/* Aggregate judge reasoning (skip when single judge row already shows it) */}
        {data.judgeResults.length !== 1 &&
          data.judgeReasoning &&
          (() => {
            const isFailed = data.judgeScore === 0;
            return (
              <div
                className={`rounded-lg border p-4 ${isFailed ? 'border-red-200 bg-red-50' : 'border-indigo-200 bg-indigo-50'}`}
              >
                <p
                  className={`text-sm font-medium ${isFailed ? 'text-red-800' : 'text-indigo-800'}`}
                >
                  {isFailed ? 'Judge Error' : 'Judge Reasoning'}
                  {data.judgeScore != null && data.judgeScore > 0 && (
                    <span className="ml-2 font-normal text-indigo-600">
                      (Score: {data.judgeScore}
                      {data.isJudgeSelected ? ' — Selected' : ''})
                    </span>
                  )}
                </p>
                <p className={`mt-2 text-sm ${isFailed ? 'text-red-700' : 'text-indigo-700'}`}>
                  {data.judgeReasoning}
                </p>
              </div>
            );
          })()}

        {/* Judge output */}
        {data.judgeResults.length !== 1 && data.judgeOutput && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-800">Judge Output</p>
            <pre className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
              {data.judgeOutput}
            </pre>
          </div>
        )}

        {/* Legacy single-judge audit */}
        {data.judgeResults.length === 0 &&
          (data.judgeSystemPrompt || data.judgeUserPrompt || data.judgeInputImages) && (
            <div className="space-y-3">
              {data.judgeTypeUsed && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Judge Mode
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      data.judgeTypeUsed === 'batch'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {data.judgeTypeUsed === 'batch'
                      ? 'Batch (all images in one request)'
                      : 'Individual (one image per request)'}
                  </span>
                </div>
              )}
              {data.judgeSystemPrompt && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Judge System Prompt
                  </p>
                  <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                    {data.judgeSystemPrompt}
                  </pre>
                </div>
              )}
              {data.judgeUserPrompt && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Judge User Prompt
                  </p>
                  <pre className="max-h-48 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">
                    {data.judgeUserPrompt}
                  </pre>
                </div>
              )}
              {data.judgeInputImages && data.judgeInputImages.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Judge Input Images ({data.judgeInputImages.length})
                  </p>
                  <AuditImageGrid images={data.judgeInputImages} />
                </div>
              )}
            </div>
          )}
      </div>
    </SectionToggle>
  );
}
