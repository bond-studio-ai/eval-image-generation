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
        className={`text-caption inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 font-medium shadow-sm transition-colors ${
          state.open ? "border-primary-300 bg-primary-50/90 text-primary-800" : "border-border bg-surface-muted text-text-secondary hover:border-border-strong hover:bg-surface-sunken"
        }`}
      >
        <span className="truncate">Dollhouse</span>
        <ChevronDownIcon className={`text-text-disabled h-3.5 w-3.5 flex-none ${state.open ? "rotate-180" : ""}`} />
      </button>
      {state.open && (
        <div className="border-border bg-surface absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border shadow-lg">
          {state.product ? (
            <>
              <div className="border-border-subtle flex items-center gap-1 border-b px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "clearProduct" });
                  }}
                  className="text-primary-700 hover:bg-primary-50 text-caption rounded px-2 py-1 font-medium"
                >
                  ← Back
                </button>
                <span className="text-text-secondary text-caption min-w-0 flex-1 truncate font-medium">
                  <span className="font-mono">{state.product}</span>
                </span>
              </div>
              <p className="border-border-subtle text-text-muted border-b px-3 py-1.5 text-[11px]">
                Inserts a <code className="bg-surface-sunken rounded px-0.5">{`{{#each dollhouse.${state.product}.visibility}}…{{/each}}`}</code> block.
              </p>
              <div className="max-h-60 overflow-auto py-1">
                {DOLLHOUSE_ATTRIBUTES.map((attr) => (
                  <button
                    key={attr.value}
                    type="button"
                    onClick={() => {
                      onAttributeSelect(attr);
                    }}
                    className="hover:bg-surface-muted flex w-full flex-col items-start px-3 py-2 text-left"
                  >
                    <span className="text-text-primary text-caption font-mono">{attr.value}</span>
                    <span className="text-text-muted text-[11px]">{attr.helper}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="border-border-subtle text-text-muted border-b px-3 py-2 text-[11px]">
                Pick a <strong>product</strong>. Inserts a <code className="bg-surface-sunken rounded px-0.5">{`{{#each dollhouse.{product}.visibility}}…{{/each}}`}</code> block; the{" "}
                <code className="bg-surface-sunken rounded px-0.5">dollhouse</code> namespace is bound per image at render time.
              </p>
              <div className="border-border border-b p-2">
                <input
                  type="text"
                  aria-label="Search dollhouse products"
                  value={state.search}
                  onChange={(e) => {
                    dispatch({ type: "setSearch", value: e.target.value });
                  }}
                  placeholder="Search or type a custom product key…"
                  className="focus:border-primary-500 focus:ring-primary-500 border-border text-body w-full rounded-md border px-3 py-1.5 focus:ring-1"
                />
                {/* eslint-disable-next-line unicorn/prefer-includes -- readonly literal tuple: .includes() rejects an arbitrary string arg */}
                {customProduct && !DOLLHOUSE_PRODUCT_TYPES.some((product) => product === customProduct) && (
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "setProduct", value: customProduct });
                    }}
                    className="border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100 text-body mt-2 w-full rounded-md border border-dashed px-3 py-2 text-left"
                  >
                    Use custom product key <span className="font-mono">{customProduct}</span>
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-auto py-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product}
                    type="button"
                    onClick={() => {
                      dispatch({ type: "setProduct", value: product });
                    }}
                    className="text-text-primary hover:bg-surface-muted text-caption w-full px-3 py-2 text-left font-mono"
                  >
                    {product}
                  </button>
                ))}
                {filteredProducts.length === 0 && <p className="text-text-muted text-body px-3 py-2">No matches</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
