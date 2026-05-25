'use client';

import { type ReactNode } from 'react';
import { cn } from './cn';
import { AlertCircleIcon, CheckIcon } from './icons';

export type StepperStepState = 'complete' | 'current' | 'pending' | 'error';

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
    <nav aria-label={label ?? 'Progress'} className={cn('w-full', className)}>
      <ol className="flex w-full items-start gap-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li key={step.id} className={cn('flex min-w-0 items-start', !isLast && 'flex-1')}>
              <StepButton
                step={step}
                index={index}
                onClick={onStepClick ? () => onStepClick(step.id) : undefined}
              />
              {!isLast && <Connector state={step.state} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepButton({
  step,
  index,
  onClick,
}: {
  step: StepperStep;
  index: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <StepCircle state={step.state} index={index} />
      <span className="ml-3 flex min-w-0 flex-col text-left">
        <span
          className={cn(
            'text-caption font-semibold tracking-wide uppercase',
            step.state === 'current'
              ? 'text-primary-700'
              : step.state === 'complete'
                ? 'text-text-primary'
                : step.state === 'error'
                  ? 'text-danger-700'
                  : 'text-text-muted',
          )}
        >
          Step {index + 1}
        </span>
        <span
          className={cn(
            'text-body truncate font-medium',
            step.state === 'pending' ? 'text-text-muted' : 'text-text-primary',
          )}
        >
          {step.label}
        </span>
        {step.description && (
          <span className="text-caption text-text-muted truncate">{step.description}</span>
        )}
      </span>
    </>
  );

  const baseClass =
    'group flex min-w-0 items-start rounded-md px-2 py-1 -ml-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={step.state === 'current' ? 'step' : undefined}
        className={cn(baseClass, 'hover:bg-surface-muted cursor-pointer')}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      aria-current={step.state === 'current' ? 'step' : undefined}
      className={cn(baseClass, 'cursor-default')}
    >
      {content}
    </div>
  );
}

function StepCircle({ state, index }: { state: StepperStepState; index: number }) {
  const baseClass =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-caption font-semibold';

  let icon: ReactNode;
  let cls: string;
  switch (state) {
    case 'complete':
      icon = <CheckIcon className="h-4 w-4" aria-hidden />;
      cls = 'bg-success-600 border-success-600 text-text-inverse';
      break;
    case 'current':
      icon = index + 1;
      cls = 'bg-surface border-primary-600 text-primary-700';
      break;
    case 'error':
      icon = <AlertCircleIcon className="h-4 w-4" aria-hidden />;
      cls = 'bg-danger-50 border-danger-600 text-danger-700';
      break;
    case 'pending':
      icon = index + 1;
      cls = 'bg-surface border-border-strong text-text-muted';
      break;
  }

  return <span className={cn(baseClass, cls)}>{icon}</span>;
}

function Connector({ state }: { state: StepperStepState }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mx-3 mt-4 h-0.5 flex-1 rounded',
        state === 'complete' ? 'bg-success-600' : 'bg-border',
      )}
    />
  );
}
