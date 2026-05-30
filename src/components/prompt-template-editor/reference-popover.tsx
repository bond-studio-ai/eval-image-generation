import { type Dispatch } from 'react';
import { ChevronDownIcon } from '@/components/ui/icons';
import { REFERENCE_OPTIONS } from '@/lib/prompt-template-constants';
import {
  type AttributesAction,
  type AttributesState,
  type ReferenceAction,
  type ReferenceState,
} from './state';

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

export function ReferencePopover({
  state,
  dispatch,
  attrState,
  dispatchAttributes,
  options,
  onToggle,
  onCategorySelect,
  onAttributeSelect,
}: ReferencePopoverProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
          state.open
            ? 'border-primary-300 bg-primary-50/90 text-primary-800'
            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
        }`}
      >
        <span className="truncate">Reference</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 flex-none text-gray-400 ${state.open ? 'rotate-180' : ''}`}
        />
      </button>
      {state.open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {!state.category ? (
            <>
              <div className="border-b border-gray-200 p-2">
                <input
                  type="text"
                  aria-label="Search products"
                  value={state.search}
                  onChange={(e) => dispatch({ type: 'setSearch', value: e.target.value })}
                  placeholder="Search products…"
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:ring-1"
                />
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {options.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => onCategorySelect(cat)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                  >
                    {cat.label}
                  </button>
                ))}
                {options.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'clearCategory' });
                    dispatchAttributes({ type: 'clear' });
                  }}
                  className="text-primary-700 hover:bg-primary-50 rounded px-2 py-1 text-xs font-medium"
                >
                  ← Back
                </button>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                  {REFERENCE_OPTIONS.find((o) => o.value === state.category)?.label ??
                    state.category}
                </span>
              </div>
              <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                Pick a field to insert{' '}
                <code className="rounded bg-gray-100 px-0.5">
                  {`{{products.${REFERENCE_OPTIONS.find((o) => o.value === state.category)?.singular ?? state.category}.…}}`}
                </code>
              </p>
              {attrState.loading ? (
                <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
              ) : attrState.error ? (
                <p className="px-3 py-4 text-sm text-red-600">{attrState.error}</p>
              ) : attrState.list.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500">No attributes</p>
              ) : (
                <div className="max-h-60 overflow-auto py-1">
                  {attrState.list.map((attr) => {
                    const opt = REFERENCE_OPTIONS.find((o) => o.value === state.category);
                    const singular = opt?.singular ?? state.category ?? '';
                    return (
                      <button
                        key={attr}
                        type="button"
                        onClick={() => onAttributeSelect(attr, singular)}
                        className="w-full px-3 py-2 text-left font-mono text-xs text-gray-900 hover:bg-gray-50"
                      >
                        {attr}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
