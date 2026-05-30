/**
 * Shared shape for an image fed into (or produced by) a strategy run step.
 * Used by both the run-detail and audit-compare views, which otherwise keep
 * their own (divergent) `StepResult`/`RunData` view models.
 */
export interface InputImage {
  url: string;
  label: string;
  isComposite?: boolean;
  sourceImages?: { url: string; label: string }[];
}
