import { type Dispatch } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { REFERENCE_OPTIONS } from "@/lib/prompt-template-constants";
import { type AttributesAction, type AttributesState, type ReferenceAction, type ReferenceState } from "./state";

interface ReferencePopoverProps {
  state: ReferenceState;
  dispatch: Dispatch<ReferenceAction>;
  attrState: AttributesState;
  dispatchAttributes: Dispatch<AttributesAction>;
  options: readonly (typeof REFERENCE_OPTIONS)[number][];
  onToggle: () => void;
  onCategorySelect: (cat: (typeof REFERENCE_OPTIONS)[number]) => void;
  onAttributeSelect: (attr: string, singular: string) => void;
}

export function ReferencePopover({ state, dispatch, attrState, dispatchAttributes, options, onToggle, onCategorySelect, onAttributeSelect }: ReferencePopoverProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`text-caption inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 font-medium shadow-sm transition-colors ${
          state.open ? "border-primary-300 bg-primary-50/90 text-primary-800" : "border-border bg-surface-muted text-text-secondary hover:border-border-strong hover:bg-surface-sunken"
        }`}
      >
        <span className="truncate">Reference</span>
        <ChevronDownIcon className={`text-text-disabled h-3.5 w-3.5 flex-none ${state.open ? "rotate-180" : ""}`} />
      </button>
      {state.open && (
        <div className="border-border bg-surface absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border shadow-lg">
          {state.category ? (
            <>
              <div className="border-border-subtle flex items-center gap-1 border-b px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "clearCategory" });
                    dispatchAttributes({ type: "clear" });
                  }}
                  className="text-primary-700 hover:bg-primary-50 text-caption rounded px-2 py-1 font-medium"
                >
                  ← Back
                </button>
                <span className="text-text-secondary text-caption min-w-0 flex-1 truncate font-medium">{REFERENCE_OPTIONS.find((option) => option.value === state.category)?.label ?? state.category}</span>
              </div>
              <p className="border-border-subtle text-text-muted border-b px-3 py-1.5 text-[11px]">
                Pick a field to insert <code className="bg-surface-sunken rounded px-0.5">{`{{products.${REFERENCE_OPTIONS.find((option) => option.value === state.category)?.singular ?? state.category}.…}}`}</code>
              </p>
              {attrState.loading ? <p className="text-text-muted text-body px-3 py-4">Loading…</p> : null}
              {!attrState.loading && attrState.error ? <p className="text-danger-600 text-body px-3 py-4">{attrState.error}</p> : null}
              {!attrState.loading && !attrState.error && attrState.list.length === 0 ? <p className="text-text-muted text-body px-3 py-4">No attributes</p> : null}
              {!attrState.loading && !attrState.error && attrState.list.length > 0 ? (
                <div className="max-h-60 overflow-auto py-1">
                  {attrState.list.map((attr) => {
                    const opt = REFERENCE_OPTIONS.find((option) => option.value === state.category);
                    const singular = opt?.singular ?? state.category ?? "";
                    return (
                      <button
                        key={attr}
                        type="button"
                        onClick={() => {
                          onAttributeSelect(attr, singular);
                        }}
                        className="text-text-primary hover:bg-surface-muted text-caption w-full px-3 py-2 text-left font-mono"
                      >
                        {attr}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="border-border border-b p-2">
                <input
                  type="text"
                  aria-label="Search products"
                  value={state.search}
                  onChange={(e) => {
                    dispatch({ type: "setSearch", value: e.target.value });
                  }}
                  placeholder="Search products…"
                  className="focus:border-primary-500 focus:ring-primary-500 border-border text-body w-full rounded-md border px-3 py-1.5 focus:ring-1"
                />
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {options.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      onCategorySelect(cat);
                    }}
                    className="text-text-primary hover:bg-surface-muted text-body w-full px-3 py-2 text-left"
                  >
                    {cat.label}
                  </button>
                ))}
                {options.length === 0 && <p className="text-text-muted text-body px-3 py-2">No matches</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
