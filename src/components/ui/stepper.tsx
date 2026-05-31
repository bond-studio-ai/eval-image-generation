"use client";

import { type ReactNode } from "react";
import { cn } from "./cn";
import { AlertCircleIcon, CheckIcon } from "./icons";
import { assertNever } from "@/lib/assert-never";

export type StepperStepState = "complete" | "current" | "pending" | "error";

export interface StepperStep {
  id: string;
  label: string;
  state: StepperStepState;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  onStepClick?: (id: string) => void;
  className?: string;
  label?: string;
}

/**
 * Horizontal numbered step indicator for wizard-style forms. Each step is
 * clickable so users can jump back to a previously-completed step. We do not
 * enforce sequential navigation — the parent form decides when downstream
 * sections render.
 */
export function Stepper({ steps, onStepClick, className, label }: StepperProps) {
  return (
    <nav aria-label={label ?? "Progress"} className={cn("w-full", className)}>
      <ol className="flex w-full items-start gap-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className={cn("flex min-w-0 items-start", !isLast && "flex-1")}>
              <StepButton
                step={step}
                index={index}
                onClick={
                  onStepClick
                    ? () => {
                        onStepClick(step.id);
                      }
                    : undefined
                }
              />
              {!isLast && <Connector state={step.state} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const STEP_LABEL_COLOR: Record<StepperStepState, string> = {
  current: "text-primary-700",
  complete: "text-text-primary",
  error: "text-danger-700",
  pending: "text-text-muted"
};

function StepButton({ step, index, onClick }: { step: StepperStep; index: number; onClick?: (() => void) | undefined }) {
  const content = (
    <>
      <StepCircle state={step.state} index={index} />
      <span className="ml-3 flex min-w-0 flex-col text-left">
        <span className={cn("text-caption font-semibold tracking-wide uppercase", STEP_LABEL_COLOR[step.state])}>Step {index + 1}</span>
        <span className={cn("text-body truncate font-medium", step.state === "pending" ? "text-text-muted" : "text-text-primary")}>{step.label}</span>
        {step.description && <span className="text-caption text-text-muted truncate">{step.description}</span>}
      </span>
    </>
  );

  const baseClass = "group flex min-w-0 items-start rounded-md px-2 py-1 -ml-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-current={step.state === "current" ? "step" : undefined} className={cn(baseClass, "hover:bg-surface-muted cursor-pointer")}>
        {content}
      </button>
    );
  }

  return (
    <div aria-current={step.state === "current" ? "step" : undefined} className={cn(baseClass, "cursor-default")}>
      {content}
    </div>
  );
}

function stepCircleVisual(state: StepperStepState, index: number): { icon: ReactNode; cls: string } {
  switch (state) {
    case "complete": {
      return { icon: <CheckIcon className="size-4" aria-hidden />, cls: "bg-success-600 border-success-600 text-text-inverse" };
    }
    case "current": {
      return { icon: index + 1, cls: "bg-surface border-primary-600 text-primary-700" };
    }
    case "error": {
      return { icon: <AlertCircleIcon className="size-4" aria-hidden />, cls: "bg-danger-50 border-danger-600 text-danger-700" };
    }
    case "pending": {
      return { icon: index + 1, cls: "bg-surface border-border-strong text-text-muted" };
    }
    default: {
      return assertNever(state);
    }
  }
}

function StepCircle({ state, index }: { state: StepperStepState; index: number }) {
  const baseClass = "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-caption font-semibold";
  const { icon, cls } = stepCircleVisual(state, index);
  return <span className={cn(baseClass, cls)}>{icon}</span>;
}

function Connector({ state }: { state: StepperStepState }) {
  return <span aria-hidden className={cn("mx-3 mt-4 h-0.5 flex-1 rounded", state === "complete" ? "bg-success-600" : "bg-border")} />;
}
