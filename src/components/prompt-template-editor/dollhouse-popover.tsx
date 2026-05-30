import { type Dispatch } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { DOLLHOUSE_ATTRIBUTES, DOLLHOUSE_PRODUCT_TYPES, type DollhouseProductType } from "@/lib/prompt-template-constants";
import { type DollhouseAction, type DollhouseState } from "./state";

interface DollhousePopoverProps {
  state: DollhouseState;
  dispatch: Dispatch<DollhouseAction>;
  filteredProducts: readonly DollhouseProductType[];
  customProduct: DollhouseProductType;
  onToggle: () => void;
  onAttributeSelect: (attr: (typeof DOLLHOUSE_ATTRIBUTES)[number]) => void;
}

export function DollhousePopover({ state, dispatch, filteredProducts, customProduct, onToggle, onAttributeSelect }: DollhousePopoverProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        title="Insert a dollhouse reference like {{dollhouse.vanity.quantity}} or {{#each dollhouse.vanity.visibility}}{{location}} ({{visible}}%){{/each}}"
        className={`inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
          state.open ? "border-primary-300 bg-primary-50/90 text-primary-800" : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <span className="truncate">Dollhouse</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 flex-none text-gray-400 ${state.open ? "rotate-180" : ""}`} />
      </button>
      {state.open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {!state.product ? (
            <>
              <p className="border-b border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                Pick a <strong>product</strong>. Inserts a <code className="rounded bg-gray-100 px-0.5">{`{{#each dollhouse.{product}.visibility}}…{{/each}}`}</code> block; the <code className="rounded bg-gray-100 px-0.5">dollhouse</code>{" "}
                namespace is bound per image at render time.
              </p>
              <div className="border-b border-gray-200 p-2">
                <input
                  type="text"
                  aria-label="Search dollhouse products"
                  value={state.search}
                  onChange={(e) => dispatch({ type: "setSearch", value: e.target.value })}
                  placeholder="Search or type a custom product key…"
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:ring-1"
                />
                {customProduct && !DOLLHOUSE_PRODUCT_TYPES.some((product) => product === customProduct) && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "setProduct", value: customProduct })}
                    className="border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100 mt-2 w-full rounded-md border border-dashed px-3 py-2 text-left text-sm"
                  >
                    Use custom product key <span className="font-mono">{customProduct}</span>
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {filteredProducts.map((product) => (
                  <button key={product} type="button" onClick={() => dispatch({ type: "setProduct", value: product })} className="w-full px-3 py-2 text-left font-mono text-xs text-gray-900 hover:bg-gray-50">
                    {product}
                  </button>
                ))}
                {filteredProducts.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No matches</p>}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
                <button type="button" onClick={() => dispatch({ type: "clearProduct" })} className="text-primary-700 hover:bg-primary-50 rounded px-2 py-1 text-xs font-medium">
                  ← Back
                </button>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                  <span className="font-mono">{state.product}</span>
                </span>
              </div>
              <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                Inserts a <code className="rounded bg-gray-100 px-0.5">{`{{#each dollhouse.${state.product}.visibility}}…{{/each}}`}</code> block.
              </p>
              <div className="max-h-60 overflow-auto py-1">
                {DOLLHOUSE_ATTRIBUTES.map((attr) => (
                  <button key={attr.value} type="button" onClick={() => onAttributeSelect(attr)} className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50">
                    <span className="font-mono text-xs text-gray-900">{attr.value}</span>
                    <span className="text-[11px] text-gray-500">{attr.helper}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
