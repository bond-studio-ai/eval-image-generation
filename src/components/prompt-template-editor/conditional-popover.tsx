import { type Dispatch } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { CONDITIONAL_OPTIONS } from "@/lib/prompt-template-constants";
import { type ConditionalAction, type ConditionalState } from "./state";

interface ConditionalPopoverProps {
  state: ConditionalState;
  dispatch: Dispatch<ConditionalAction>;
  options: readonly (typeof CONDITIONAL_OPTIONS)[number][];
  onToggle: () => void;
  onSelect: (opt: (typeof CONDITIONAL_OPTIONS)[number]) => void;
}

export function ConditionalPopover({ state, dispatch, options, onToggle, onSelect }: ConditionalPopoverProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`text-caption inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 font-medium shadow-sm transition-colors ${
          state.open ? "border-primary-300 bg-primary-50/90 text-primary-800" : "border-border bg-surface-muted text-text-secondary hover:border-border-strong hover:bg-surface-sunken"
        }`}
      >
        <span className="truncate">Conditional</span>
        <ChevronDownIcon className={`text-text-disabled h-3.5 w-3.5 flex-none ${state.open ? "rotate-180" : ""}`} />
      </button>
      {state.open && (
        <div className="border-border bg-surface absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border shadow-lg">
          <div className="border-border border-b p-2">
            <input
              type="text"
              aria-label="Search conditionals"
              value={state.search}
              onChange={(e) => dispatch({ type: "setSearch", value: e.target.value })}
              placeholder="Search…"
              className="focus:border-primary-500 focus:ring-primary-500 border-border text-body w-full rounded-md border px-3 py-1.5 focus:ring-1"
            />
          </div>
          <div className="max-h-48 overflow-auto py-1">
            {options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => onSelect(opt)} className="text-text-primary hover:bg-surface-muted text-body w-full px-3 py-2 text-left">
                {opt.label}
              </button>
            ))}
            {options.length === 0 && <p className="text-text-muted text-body px-3 py-2">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}
