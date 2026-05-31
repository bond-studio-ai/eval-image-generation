import { RunJudgeEvaluationsSection } from "@/components/run-judge-evaluations-section";
import { AuditImageGrid } from "./audit";
import { SectionToggle } from "./shared";
import type { RunData } from "./types";

export function JudgeEvaluationSection({ data, open, onToggle }: { data: RunData; open: boolean; onToggle: () => void }) {
  const hasJudgeInfo = data.judgeResults.length > 0 || data.judgeReasoning || data.judgeSystemPrompt || data.judgeUserPrompt;

  if (!hasJudgeInfo) return null;

  return (
    <SectionToggle
      title="Judge Evaluation"
      open={open}
      onToggle={onToggle}
      {...(data.judgeResults.length > 0 ? { count: data.judgeResults.length } : {})}
      badge={
        data.judgeScore != null && data.judgeScore > 0 ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${data.isJudgeSelected ? "bg-warning-100 text-warning-700" : "bg-surface-sunken text-text-secondary"}`}>Score: {data.judgeScore}</span>
        ) : null
      }
    >
      <div className="space-y-4 p-4">
        {/* Per-judge evaluations */}
        {data.judgeResults.length > 0 && <RunJudgeEvaluationsSection judgeResults={data.judgeResults} />}

        {/* Aggregate judge reasoning (skip when single judge row already shows it) */}
        {data.judgeResults.length !== 1 &&
          data.judgeReasoning &&
          (() => {
            const isFailed = data.judgeScore === 0;
            return (
              <div className={`rounded-lg border p-4 ${isFailed ? "border-danger-200 bg-danger-50" : "border-primary-200 bg-primary-50"}`}>
                <p className={`text-body font-medium ${isFailed ? "text-danger-800" : "text-primary-800"}`}>
                  {isFailed ? "Judge Error" : "Judge Reasoning"}
                  {data.judgeScore != null && data.judgeScore > 0 && (
                    <span className="text-primary-600 ml-2 font-normal">
                      (Score: {data.judgeScore}
                      {data.isJudgeSelected ? " — Selected" : ""})
                    </span>
                  )}
                </p>
                <p className={`text-body mt-2 ${isFailed ? "text-danger-700" : "text-primary-700"}`}>{data.judgeReasoning}</p>
              </div>
            );
          })()}

        {/* Judge output */}
        {data.judgeResults.length !== 1 && data.judgeOutput && (
          <div className="border-border bg-surface-muted rounded-lg border p-4">
            <p className="text-text-secondary text-body font-medium">Judge Output</p>
            <pre className="text-text-secondary text-caption mt-2 leading-relaxed whitespace-pre-wrap">{data.judgeOutput}</pre>
          </div>
        )}

        {/* Legacy single-judge audit */}
        {data.judgeResults.length === 0 && (data.judgeSystemPrompt || data.judgeUserPrompt || data.judgeInputImages) && (
          <div className="space-y-3">
            {data.judgeTypeUsed && (
              <div>
                <p className="text-text-disabled mb-1 text-[10px] font-semibold tracking-wider uppercase">Judge Mode</p>
                <span className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${data.judgeTypeUsed === "batch" ? "bg-primary-100 text-primary-700" : "bg-warning-100 text-warning-700"}`}>
                  {data.judgeTypeUsed === "batch" ? "Batch (all images in one request)" : "Individual (one image per request)"}
                </span>
              </div>
            )}
            {data.judgeSystemPrompt && (
              <div>
                <p className="text-text-disabled mb-1 text-[10px] font-semibold tracking-wider uppercase">Judge System Prompt</p>
                <pre className="border-border bg-surface-muted text-text-secondary text-caption max-h-48 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{data.judgeSystemPrompt}</pre>
              </div>
            )}
            {data.judgeUserPrompt && (
              <div>
                <p className="text-text-disabled mb-1 text-[10px] font-semibold tracking-wider uppercase">Judge User Prompt</p>
                <pre className="border-border bg-surface-muted text-text-secondary text-caption max-h-48 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{data.judgeUserPrompt}</pre>
              </div>
            )}
            {data.judgeInputImages && data.judgeInputImages.length > 0 && (
              <div>
                <p className="text-text-disabled mb-1 text-[10px] font-semibold tracking-wider uppercase">Judge Input Images ({data.judgeInputImages.length})</p>
                <AuditImageGrid images={data.judgeInputImages} />
              </div>
            )}
          </div>
        )}
      </div>
    </SectionToggle>
  );
}
