"use client";

import { useCallback, useMemo, useState } from "react";
import { useCatalogProducts } from "@/components/design-settings-catalog";
import { ProductImageDownloads } from "@/components/design-settings-downloads";
import {
  ALL_FIELD_KEYS,
  type ArbitraryImageMap,
  type BooleanFieldDef,
  type CatalogProduct,
  DEFAULT_PRODUCT_IMAGE_TYPE,
  FIELDS,
  getProductImageTypeKey,
  PRODUCT_FIELDS,
  type ProductFieldDef,
  type ProductImageType,
  readProductImageType,
  type SelectFieldDef,
  SETTING_FIELDS,
  SLOT_TO_CATALOG_CATEGORY
} from "@/components/design-settings-fields";
import { ProductSelectionModal } from "@/components/design-settings-product-modal";
import { isNonEmpty } from "@/components/design-settings-values";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { Button } from "@/components/ui/button";

export { useCatalogProducts };
export { DesignSettingsDisplay } from "@/components/design-settings-display";

export type DesignSettingsValue = Record<string, unknown> | null;

interface DesignSettingsEditorProps {
  value: DesignSettingsValue;
  onChange: (value: DesignSettingsValue) => void;
  arbitraryImagesBySlot: ArbitraryImageMap;
  onArbitraryImagesBySlotChange: (value: ArbitraryImageMap) => void;
  savedImageUrlsBySlot?: Record<string, string | null>;
  retailerId?: string;
}

export function DesignSettingsEditor({ value, onChange, arbitraryImagesBySlot, onArbitraryImagesBySlotChange, savedImageUrlsBySlot, retailerId }: DesignSettingsEditorProps) {
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { products, byId, loaded } = useCatalogProducts(retailerId);
  const data = useMemo(() => value ?? {}, [value]);

  const setField = useCallback(
    (key: string, nextValue: unknown) => {
      const { [key]: _omitted, ...rest } = data;
      const next = nextValue == null || nextValue === "" ? rest : { ...rest, [key]: nextValue };
      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [data, onChange]
  );

  const filledCount = useMemo(() => FIELDS.filter((field) => isNonEmpty(data[field.key])).length, [data]);
  const extraKeys = useMemo(() => Object.keys(data).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(data[key])), [data]);

  const clearAll = useCallback(() => {
    onChange(null);
    onArbitraryImagesBySlotChange({});
  }, [onArbitraryImagesBySlotChange, onChange]);

  const switchToJson = useCallback(() => {
    const obj = value ?? {};
    setJsonText(Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : "{}");
    setJsonError(null);
    setMode("json");
  }, [value]);

  const switchToForm = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === "" || trimmed === "{}") {
      onChange(null);
      setMode("form");
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Must be a JSON object.");
        return;
      }
      const nextImages = Object.fromEntries(Object.entries(arbitraryImagesBySlot).filter(([slot, url]) => Boolean(url) && (parsed as Record<string, unknown>)[getProductImageTypeKey(slot)] === "arbitrary"));
      onArbitraryImagesBySlotChange(nextImages);
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      setMode("form");
    } catch {
      setJsonError("Invalid JSON.");
    }
  }, [arbitraryImagesBySlot, jsonText, onArbitraryImagesBySlotChange, onChange]);

  const applyJson = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === "" || trimmed === "{}") {
      onChange(null);
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Must be a JSON object.");
        return;
      }
      const nextImages = Object.fromEntries(Object.entries(arbitraryImagesBySlot).filter(([slot, url]) => Boolean(url) && (parsed as Record<string, unknown>)[getProductImageTypeKey(slot)] === "arbitrary"));
      onArbitraryImagesBySlotChange(nextImages);
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON.");
    }
  }, [arbitraryImagesBySlot, jsonText, onArbitraryImagesBySlotChange, onChange]);

  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <div className="border-border-subtle flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-text-primary text-body font-semibold uppercase">Design Settings</h2>
          {filledCount > 0 && <span className="bg-primary-50 text-primary-700 ring-primary-200 text-caption inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset">{filledCount} set</span>}
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && mode === "form" && (
            <button type="button" onClick={clearAll} className="text-text-muted hover:bg-surface-sunken hover:text-danger-600 text-caption rounded px-2 py-1 font-medium transition-colors">
              Clear all
            </button>
          )}
          <div className="border-border bg-surface-muted flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={mode === "json" ? switchToForm : undefined}
              className={`text-caption rounded px-2.5 py-1 font-medium transition-colors ${mode === "form" ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={mode === "form" ? switchToJson : undefined}
              className={`text-caption rounded px-2.5 py-1 font-medium transition-colors ${mode === "json" ? "bg-surface text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {mode === "form" ? (
        <div className="px-5 py-4">
          <div className="space-y-6">
            <section className="border-border bg-surface rounded-lg border p-4">
              <div className="mb-4">
                <h3 className="text-text-muted text-caption font-semibold tracking-wide uppercase">Placement & Visibility</h3>
                <p className="text-text-muted text-caption mt-1">Configure placement, patterns, and visibility settings separately from product selection.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {SETTING_FIELDS.map((field) =>
                  field.type === "select" ? (
                    <SelectField
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      onChange={(nextValue) => {
                        setField(field.key, nextValue);
                      }}
                    />
                  ) : (
                    <BooleanField
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      onChange={(nextValue) => {
                        setField(field.key, nextValue);
                      }}
                    />
                  )
                )}
              </div>
            </section>

            <section className="border-border bg-surface-muted/40 rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-text-muted text-caption font-semibold tracking-wide uppercase">Product Selection</h3>
                  <p className="text-text-muted text-caption mt-1">Configure each slot from its modal picker.</p>
                </div>
                <span className="bg-surface-sunken text-text-secondary rounded-full px-2 py-0.5 text-[11px] font-medium">{PRODUCT_FIELDS.length} slots</span>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {PRODUCT_FIELDS.map((field) => (
                  <ProductField
                    key={field.key}
                    field={field}
                    value={data[field.key]}
                    imageTypeValue={data[getProductImageTypeKey(field.key)]}
                    loaded={loaded}
                    products={products}
                    selectedProduct={typeof data[field.key] === "string" ? (byId.get(data[field.key] as string) ?? null) : null}
                    arbitraryImagesBySlot={arbitraryImagesBySlot}
                    savedImageUrl={savedImageUrlsBySlot?.[field.key] ?? null}
                    onApplySelection={({ productId, imageType, arbitraryUrl }) => {
                      const imageTypeKey = getProductImageTypeKey(field.key);
                      const { [field.key]: _omitProduct, [imageTypeKey]: _omitImageType, ...rest } = data;
                      const withProduct = productId == null || productId === "" ? rest : { ...rest, [field.key]: productId };
                      const next = imageType == null ? withProduct : { ...withProduct, [imageTypeKey]: imageType };

                      if (imageType === "arbitrary") {
                        onArbitraryImagesBySlotChange({
                          ...arbitraryImagesBySlot,
                          [field.key]: arbitraryUrl
                        });
                      } else if (arbitraryImagesBySlot[field.key]) {
                        const { [field.key]: _omitArbitrary, ...nextImages } = arbitraryImagesBySlot;
                        onArbitraryImagesBySlotChange(nextImages);
                      }

                      onChange(Object.keys(next).length === 0 ? null : next);
                    }}
                    onClearSelection={() => {
                      const { [field.key]: _omitKey, [getProductImageTypeKey(field.key)]: _omitType, ...next } = data;
                      if (arbitraryImagesBySlot[field.key]) {
                        const { [field.key]: _omitArbitrary, ...nextImages } = arbitraryImagesBySlot;
                        onArbitraryImagesBySlotChange(nextImages);
                      }
                      onChange(Object.keys(next).length === 0 ? null : next);
                    }}
                  />
                ))}
              </div>
            </section>
          </div>

          {extraKeys.length > 0 && (
            <div className="border-warning-200 bg-warning-50 mt-4 rounded-md border px-4 py-3">
              <p className="text-warning-700 text-caption mb-2 font-medium">Additional fields (switch to JSON to edit):</p>
              <div className="space-y-1">
                {extraKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-warning-800 text-caption font-mono">{key}</span>
                    <span className="text-warning-600 text-caption font-mono">{JSON.stringify(data[key])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <p className="text-text-muted text-caption mb-2">Raw JSON with camelCase keys. Switch back to Form to use the structured editor.</p>
          <textarea
            aria-label="Design settings JSON"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            spellCheck={false}
            rows={14}
            className="border-border-strong bg-surface-muted text-text-primary focus:border-primary-500 focus:ring-primary-500 text-caption block w-full rounded-md border px-3 py-2 font-mono shadow-xs focus:ring-1 focus:outline-none"
            placeholder={'{\n  "vanity": "00000000-0000-4000-8000-000000000000",\n  "wallTilePlacement": "VanityHalfWall"\n}'}
          />
          {jsonError && <p className="text-danger-600 text-caption mt-2">{jsonError}</p>}
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={applyJson}>
              Apply JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({ field, value, onChange }: { field: SelectFieldDef; value: unknown; onChange: (value: string | null) => void }) {
  const currentValue = typeof value === "string" ? value : "";
  return (
    <div>
      <label className="text-text-secondary text-caption mb-1.5 block font-medium">{field.label}</label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            onChange(null);
          }}
          className={`text-caption rounded-md border px-3 py-1.5 font-medium transition-all ${
            currentValue ? "border-border bg-surface text-text-disabled hover:border-border-strong hover:text-text-secondary" : "border-border-strong bg-surface-sunken text-text-secondary shadow-sm"
          }`}
        >
          Not set
        </button>
        {field.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
            }}
            className={`text-caption rounded-md border px-3 py-1.5 font-medium transition-all ${
              currentValue === option.value ? "border-primary-300 bg-primary-50 text-primary-700 ring-primary-200 shadow-sm ring-1" : "border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BooleanField({ field, value, onChange }: { field: BooleanFieldDef; value: unknown; onChange: (value: boolean | null) => void }) {
  const currentValue = typeof value === "boolean" ? value : null;
  return (
    <div>
      <label className="text-text-secondary text-caption mb-1.5 block font-medium">{field.label}</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            onChange(null);
          }}
          className={`text-caption rounded-md border px-3 py-1.5 font-medium transition-all ${
            currentValue === null ? "border-border-strong bg-surface-sunken text-text-secondary shadow-sm" : "border-border bg-surface text-text-disabled hover:border-border-strong hover:text-text-secondary"
          }`}
        >
          Not set
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(true);
          }}
          className={`text-caption rounded-md border px-3 py-1.5 font-medium transition-all ${
            currentValue === true ? "border-success-300 bg-success-50 text-success-700 ring-success-200 shadow-sm ring-1" : "border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted"
          }`}
        >
          On
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(false);
          }}
          className={`text-caption rounded-md border px-3 py-1.5 font-medium transition-all ${
            currentValue === false ? "border-danger-300 bg-danger-50 text-danger-700 ring-danger-200 shadow-sm ring-1" : "border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-muted"
          }`}
        >
          Off
        </button>
      </div>
    </div>
  );
}

function ProductField({
  field,
  value,
  imageTypeValue,
  loaded,
  products,
  selectedProduct,
  arbitraryImagesBySlot,
  savedImageUrl,
  onApplySelection,
  onClearSelection
}: {
  field: ProductFieldDef;
  value: unknown;
  imageTypeValue: unknown;
  loaded: boolean;
  products: CatalogProduct[];
  selectedProduct: CatalogProduct | null;
  arbitraryImagesBySlot: ArbitraryImageMap;
  savedImageUrl: string | null;
  onApplySelection: (value: { productId: string | null; imageType: ProductImageType | null; arbitraryUrl: string | null }) => void;
  onClearSelection: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedId = typeof value === "string" ? value : "";
  const selectedImageType = readProductImageType(imageTypeValue);
  const attachedArbitraryUrl = arbitraryImagesBySlot[field.key] ?? null;
  const previewUrl = attachedArbitraryUrl ?? selectedProduct?.featuredImage?.url ?? savedImageUrl ?? null;
  const hasSelection = Boolean(selectedId) || Boolean(selectedImageType) || Boolean(attachedArbitraryUrl) || Boolean(savedImageUrl);
  const effectiveImageType = selectedImageType ?? DEFAULT_PRODUCT_IMAGE_TYPE;

  let summaryText = "Not set";
  if (selectedProduct) summaryText = selectedProduct.name;
  else if (attachedArbitraryUrl || savedImageUrl) summaryText = "URL-only attachment";

  let detailText: string | null = "Open modal to configure";
  if (selectedProduct) detailText = selectedProduct.category?.name ?? selectedId;
  else if (savedImageUrl) detailText = "Uses saved URL";
  else if (attachedArbitraryUrl) detailText = "Uses arbitrary URL";

  return (
    <div className="border-border bg-surface rounded-md border p-2.5">
      <button
        type="button"
        onClick={() => {
          setPickerOpen(true);
        }}
        className="block w-full text-left"
      >
        <div className="border-border bg-surface-muted overflow-hidden rounded-md border">
          {previewUrl ? <ImageWithSkeleton src={previewUrl} alt={field.label} wrapperClassName="h-24 w-full bg-surface-muted p-1" /> : null}
          {!previewUrl && selectedId && !loaded ? <div className="bg-border h-24 w-full animate-pulse" aria-hidden /> : null}
          {!previewUrl && !(selectedId && !loaded) ? <div className="text-text-disabled flex h-24 items-center justify-center text-[11px]">No preview</div> : null}
        </div>
        <div className="mt-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <label className="text-text-secondary text-caption truncate font-semibold">{field.label}</label>
            {effectiveImageType === "arbitrary" && <span className="bg-accent-50 text-accent-700 ring-accent-200 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset">Custom</span>}
          </div>
          <p className="text-text-secondary mt-1 truncate text-[11px]" title={summaryText}>
            {summaryText}
          </p>
          <p className="text-text-disabled mt-1 truncate text-[10px]">{detailText}</p>
        </div>
      </button>
      {(selectedId || hasSelection) && (
        <div className="mt-2 flex items-center justify-between">
          {selectedId ? <ProductImageDownloads slotKey={field.key} productId={selectedId} productName={selectedProduct?.name ?? null} /> : <span />}
          {hasSelection && (
            <button type="button" onClick={onClearSelection} className="border-border text-text-muted hover:bg-surface-muted rounded border px-2 py-1 text-[11px] font-medium">
              Clear
            </button>
          )}
        </div>
      )}

      {pickerOpen ? (
        <ProductSelectionModal
          field={field}
          catalogCategory={SLOT_TO_CATALOG_CATEGORY[field.key] ?? null}
          products={products}
          loaded={loaded}
          selectedId={selectedId}
          imageTypeValue={effectiveImageType}
          arbitraryUrl={attachedArbitraryUrl}
          savedImageUrl={savedImageUrl}
          onAccept={({ productId, imageType, arbitraryUrl }) => {
            onApplySelection({ productId, imageType, arbitraryUrl });
            setPickerOpen(false);
          }}
          onClear={() => {
            onClearSelection();
            setPickerOpen(false);
          }}
          onClose={() => {
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
