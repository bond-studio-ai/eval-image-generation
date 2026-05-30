import { SectionToggle } from "./shared";
import { StepGroupCard } from "./step-group-card";
import type { StepGroup } from "./types";

export function StepResultsSection({
  stepGroups,
  open,
  onToggle,
  onViewPrompt
}: {
  stepGroups: StepGroup[];
  open: boolean;
  onToggle: () => void;
  onViewPrompt: (id: string, name: string | null, processedSystemPrompt: string | null, processedUserPrompt: string | null) => void;
}) {
  return (
    <SectionToggle title="Step Results" count={stepGroups.length} open={open} onToggle={onToggle}>
      <div className="space-y-3 p-4">
        {stepGroups.length === 0 && <p className="text-sm text-gray-500">No step results yet.</p>}
        {stepGroups.map((group, i) => (
          <StepGroupCard key={group.stepOrder} group={group} defaultOpen={stepGroups.length <= 3 || i === stepGroups.length - 1} onViewPrompt={onViewPrompt} />
        ))}
      </div>
    </SectionToggle>
  );
}
