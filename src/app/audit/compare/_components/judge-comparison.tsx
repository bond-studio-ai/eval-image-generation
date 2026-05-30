import { DiffText } from './diff-text';
import { ImageCompare } from './image-compare';
import { orderedJudgeIds } from './judge-utils';
import { SectionHeader } from './section-header';
import type { RunData } from './types';

export function JudgeComparison({ left, right }: { left: RunData; right: RunData }) {
  const hasJudgeData =
    left.judgeResults.length > 0 ||
    right.judgeResults.length > 0 ||
    left.judgeScore != null ||
    right.judgeScore != null ||
    left.judgeSystemPrompt ||
    right.judgeSystemPrompt ||
    left.judgeReasoning ||
    right.judgeReasoning ||
    left.judgeOutput ||
    right.judgeOutput;

  if (!hasJudgeData) return null;

  return (
    <div className="mt-8 space-y-6">
      {(left.judgeResults.length > 0 || right.judgeResults.length > 0) && (
        <>
          {!(left.judgeResults.length === 1 && right.judgeResults.length === 1) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
              <h3 className="text-xs font-semibold tracking-wider text-amber-900 uppercase">
                Aggregated (average)
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div className="rounded-md bg-white p-3 ring-1 ring-amber-200/60">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Left score
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-800">{left.judgeScore ?? 'N/A'}</p>
                  {left.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                </div>
                <div className="rounded-md bg-white p-3 ring-1 ring-amber-200/60">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Right score
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-800">
                    {right.judgeScore ?? 'N/A'}
                  </p>
                  {right.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                </div>
              </div>
              {(left.judgeReasoning || right.judgeReasoning) && (
                <div className="mt-3">
                  <SectionHeader title="Aggregated reasoning" />
                  <div className="mt-2">
                    <DiffText left={left.judgeReasoning ?? ''} right={right.judgeReasoning ?? ''} />
                  </div>
                </div>
              )}
              {(left.judgeOutput || right.judgeOutput) && (
                <div className="mt-3">
                  <SectionHeader title="Aggregated parsed output" />
                  <div className="mt-2">
                    <DiffText left={left.judgeOutput ?? ''} right={right.judgeOutput ?? ''} />
                  </div>
                </div>
              )}
            </div>
          )}

          {orderedJudgeIds(left.judgeResults, right.judgeResults).map((judgeId) => {
            const lj = left.judgeResults.find((j) => j.strategyJudgeId === judgeId);
            const rj = right.judgeResults.find((j) => j.strategyJudgeId === judgeId);
            const name = lj?.judgeName || rj?.judgeName;
            const label = name || lj?.judgeModel || rj?.judgeModel || judgeId.slice(0, 8);
            return (
              <div key={judgeId} className="rounded-lg border border-indigo-200 bg-white shadow-xs">
                <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
                  <span className="text-sm font-semibold text-indigo-800">Judge: {label}</span>
                  <p className="mt-0.5 text-[11px] text-indigo-700/80">
                    Matched by judge configuration ID
                  </p>
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                        Left raw score
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-800">
                        {lj?.judgeScore ?? 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                        Right raw score
                      </p>
                      <p className="mt-1 text-lg font-bold text-gray-800">
                        {rj?.judgeScore ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                  {(lj?.judgeReasoning || rj?.judgeReasoning) && (
                    <div>
                      <SectionHeader title="Reasoning" />
                      <div className="mt-2">
                        <DiffText
                          left={lj?.judgeReasoning ?? ''}
                          right={rj?.judgeReasoning ?? ''}
                        />
                      </div>
                    </div>
                  )}
                  {(lj?.judgeOutput || rj?.judgeOutput) && (
                    <div>
                      <SectionHeader title="Parsed output" />
                      <div className="mt-2">
                        <DiffText left={lj?.judgeOutput ?? ''} right={rj?.judgeOutput ?? ''} />
                      </div>
                    </div>
                  )}
                  {(lj?.judgeSystemPrompt || rj?.judgeSystemPrompt) && (
                    <div>
                      <SectionHeader title="System prompt" />
                      <div className="mt-2">
                        <DiffText
                          left={lj?.judgeSystemPrompt ?? ''}
                          right={rj?.judgeSystemPrompt ?? ''}
                        />
                      </div>
                    </div>
                  )}
                  {(lj?.judgeUserPrompt || rj?.judgeUserPrompt) && (
                    <div>
                      <SectionHeader title="User prompt" />
                      <div className="mt-2">
                        <DiffText
                          left={lj?.judgeUserPrompt ?? ''}
                          right={rj?.judgeUserPrompt ?? ''}
                        />
                      </div>
                    </div>
                  )}
                  {(lj?.judgeInputImages || rj?.judgeInputImages) && (
                    <div>
                      <SectionHeader title="Input images" />
                      <div className="mt-2">
                        <ImageCompare
                          left={lj?.judgeInputImages ?? null}
                          right={rj?.judgeInputImages ?? null}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {left.judgeResults.length === 0 && right.judgeResults.length === 0 && (
        <div className="rounded-lg border border-indigo-200 bg-white shadow-xs">
          <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
            <span className="text-sm font-semibold text-indigo-800">Judge</span>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Score
                </p>
                <p className="mt-1 text-lg font-bold text-gray-800">{left.judgeScore ?? 'N/A'}</p>
                {left.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                {left.judgeReasoning && (
                  <p className="mt-1 text-xs text-gray-600">{left.judgeReasoning}</p>
                )}
              </div>
              <div className="rounded-md bg-gray-50 p-3">
                <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  Score
                </p>
                <p className="mt-1 text-lg font-bold text-gray-800">{right.judgeScore ?? 'N/A'}</p>
                {right.isJudgeSelected && <p className="text-xs text-amber-600">Selected</p>}
                {right.judgeReasoning && (
                  <p className="mt-1 text-xs text-gray-600">{right.judgeReasoning}</p>
                )}
              </div>
            </div>

            {(left.judgeOutput || right.judgeOutput) && (
              <div>
                <SectionHeader title="Judge parsed output" />
                <div className="mt-2">
                  <DiffText left={left.judgeOutput ?? ''} right={right.judgeOutput ?? ''} />
                </div>
              </div>
            )}

            {(left.judgeSystemPrompt || right.judgeSystemPrompt) && (
              <div>
                <SectionHeader title="Judge System Prompt" />
                <div className="mt-2">
                  <DiffText
                    left={left.judgeSystemPrompt ?? ''}
                    right={right.judgeSystemPrompt ?? ''}
                  />
                </div>
              </div>
            )}

            {(left.judgeUserPrompt || right.judgeUserPrompt) && (
              <div>
                <SectionHeader title="Judge User Prompt" />
                <div className="mt-2">
                  <DiffText left={left.judgeUserPrompt ?? ''} right={right.judgeUserPrompt ?? ''} />
                </div>
              </div>
            )}

            {(left.judgeInputImages || right.judgeInputImages) && (
              <div>
                <SectionHeader title="Judge Input Images" />
                <div className="mt-2">
                  <ImageCompare
                    left={left.judgeInputImages ?? null}
                    right={right.judgeInputImages ?? null}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
