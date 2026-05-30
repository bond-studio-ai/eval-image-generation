import { ReasoningModal } from "@/components/judge-score-badge";
import { buildPanels } from "@/components/judge-score-badge-utils";
import { ViewPromptModal } from "@/components/view-prompt-modal";
import type { RunData, ViewingPromptState } from "./types";

export function RunDetailModals({
  data,
  showJudgeModal,
  onCloseJudgeModal,
  viewingPrompt,
  onCloseViewingPrompt
}: {
  data: RunData;
  showJudgeModal: boolean;
  onCloseJudgeModal: () => void;
  viewingPrompt: ViewingPromptState;
  onCloseViewingPrompt: () => void;
}) {
  return (
    <>
      {showJudgeModal && (
        <ReasoningModal
          aggregateScore={data.judgeScore ?? 0}
          panels={buildPanels(data.judgeResults, {
            judgeReasoning: data.judgeReasoning,
            judgeOutput: data.judgeOutput,
            judgeSystemPrompt: data.judgeSystemPrompt,
            judgeUserPrompt: data.judgeUserPrompt,
            judgeTypeUsed: data.judgeTypeUsed,
            judgeScore: data.judgeScore
          })}
          isSelected={data.isJudgeSelected}
          isFailed={data.judgeScore === 0}
          onClose={onCloseJudgeModal}
        />
      )}

      {viewingPrompt.id && (
        <ViewPromptModal
          promptVersionId={viewingPrompt.id}
          promptVersionName={viewingPrompt.name}
          processedSystemPrompt={viewingPrompt.processedSystemPrompt}
          processedUserPrompt={viewingPrompt.processedUserPrompt}
          onClose={onCloseViewingPrompt}
        />
      )}
    </>
  );
}
