"use client";

import { useMemo, useRef, useState } from "react";
import { ProductListItemDownloads } from "@/components/design-settings-downloads";
import type { CatalogProduct, ProductFieldDef, ProductImageType } from "@/components/design-settings-fields";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { SceneImageInput } from "@/components/scene-image-input";
import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";

const MAX_PRODUCT_RESULTS = 50;

export function ProductSelectionModal({
  field,
  catalogCategory,
  products,
  loaded,
  selectedId,
  imageTypeValue,
  arbitraryUrl,
  savedImageUrl,
  onAccept,
  onClear,
  onClose
}: {
  field: ProductFieldDef;
  catalogCategory: string | null;
  products: CatalogProduct[];
  loaded: boolean;
  selectedId: string;
  imageTypeValue: ProductImageType;
  arbitraryUrl: string | null;
  savedImageUrl: string | null;
  onAccept: (value: { productId: string | null; imageType: ProductImageType | null; arbitraryUrl: string | null }) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [draftSelectedId, setDraftSelectedId] = useState(selectedId);
  const [draftImageType, setDraftImageType] = useState<ProductImageType>(imageTypeValue);
  const [draftArbitraryUrl, setDraftArbitraryUrl] = useState<string | null>(arbitraryUrl);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const draftSelectedProduct = useMemo(() => products.find((product) => product.id === draftSelectedId) ?? null, [products, draftSelectedId]);
  const isArbitraryMode = draftImageType === "arbitrary";
  const canAccept = !isArbitraryMode || Boolean(draftArbitraryUrl);

  const handleAccept = () => {
    if (!canAccept) return;
    onAccept({
      productId: draftSelectedId || null,
      imageType: draftImageType,
      arbitraryUrl: draftImageType === "arbitrary" ? draftArbitraryUrl : null
    });
  };

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    return products
      .filter((product) => {
        const categoryName = product.category?.name ?? "";
        if (!field.apiCategories.includes(categoryName)) return false;
        if (!query) return true;
        return product.name.toLowerCase().includes(query) || categoryName.toLowerCase().includes(query) || product.id.toLowerCase().includes(query) || product.productFamilyName?.toLowerCase().includes(query);
      })
      .slice(0, MAX_PRODUCT_RESULTS);
  }, [field.apiCategories, products, search]);

  let modeHint = "Search by product name, category, family, or ID.";
  if (isArbitraryMode) modeHint = draftSelectedId ? "Upload a custom image to override the product image sent for generation." : "Upload a custom image for this slot.";

  let draftSummary = "Not set";
  if (draftSelectedProduct) draftSummary = draftSelectedProduct.name;
  else if (draftArbitraryUrl || savedImageUrl) draftSummary = "URL-only attachment";

  let draftDetail = "Choose a catalog product or use an arbitrary image URL.";
  if (draftSelectedProduct) draftDetail = `${draftSelectedProduct.category?.name ?? "No category"} • ${draftSelectedId}`;
  else if (savedImageUrl) draftDetail = "Saved URL still available even without a product.";

  return (
    <Modal
      onClose={onClose}
      labelledById="product-selection-title"
      backdropClassName="bg-overlay/35"
      containerClassName="px-4 py-6"
      className="border-border bg-surface relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl"
      initialFocusRef={searchInputRef}
    >
      <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 id="product-selection-title" className="text-text-primary text-body font-semibold uppercase">
            {field.label}
          </h3>
          <p className="text-text-muted text-caption mt-1">{modeHint}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedId ? (
            <button type="button" onClick={onClear} className="border-border text-text-secondary hover:bg-surface-muted text-caption rounded-md border px-2.5 py-1.5 font-medium">
              Clear selection
            </button>
          ) : null}
          <button type="button" aria-label="Close product picker" onClick={onClose} className="text-text-disabled hover:bg-surface-sunken hover:text-text-secondary rounded-md p-1 transition-colors">
            <XIcon className="size-5" />
          </button>
        </div>
      </div>
      <div className="border-border-subtle space-y-4 border-b p-4">
        <div className="border-border bg-surface-muted/70 rounded-lg border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-text-muted text-caption font-semibold tracking-wide uppercase">Current selection</p>
              <p className="text-text-secondary text-body mt-1 truncate font-medium">{draftSummary}</p>
              <p className="text-text-muted text-caption mt-1">{draftDetail}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-label="Use custom image override"
                aria-checked={isArbitraryMode}
                onClick={() => {
                  setDraftImageType(isArbitraryMode ? "featured-image" : "arbitrary");
                }}
                className={`focus-visible:ring-accent-500 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                  isArbitraryMode ? "bg-accent-600" : "bg-border-strong"
                }`}
              >
                <span className={`bg-surface pointer-events-none inline-block size-3.5 rounded-full shadow-sm ring-0 transition-transform ${isArbitraryMode ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
              </button>
              <span className="text-text-secondary text-[11px] font-medium">Use custom image override</span>
            </div>
          </div>
          {draftImageType === "arbitrary" ? (
            <div className="border-accent-200 bg-accent-50/40 mt-3 rounded-md border p-3">
              <SceneImageInput label={draftSelectedId ? "Override image" : "Attached arbitrary image"} value={draftArbitraryUrl} onChange={setDraftArbitraryUrl} />
            </div>
          ) : null}
        </div>

        {isArbitraryMode ? null : (
          <input
            ref={searchInputRef}
            aria-label={`Search ${field.label.toLowerCase()}`}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder={loaded ? `Search ${field.label.toLowerCase()}...` : "Loading products..."}
            disabled={!loaded}
            className="focus:border-primary-500 focus:ring-primary-500 border-border-strong disabled:bg-surface-muted disabled:text-text-disabled text-body w-full rounded-md border px-3 py-2 focus:ring-1 focus:outline-none"
          />
        )}
      </div>
      {isArbitraryMode ? null : (
        <div className="overflow-y-auto">
          {loaded ? null : <p className="text-text-muted text-body px-4 py-6">Loading products…</p>}
          {loaded && filteredProducts.length === 0 ? <p className="text-text-muted text-body px-4 py-6">No matching products.</p> : null}
          {loaded && filteredProducts.length > 0
            ? filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`border-border-subtle flex w-full items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0 ${product.id === draftSelectedId ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-surface-muted"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDraftSelectedId(product.id);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="border-border bg-surface shrink-0 overflow-hidden rounded border">
                      {product.featuredImage?.url ? (
                        <ImageWithSkeleton src={product.featuredImage.url} alt={product.name} sizes="48px" wrapperClassName="size-12 bg-surface-muted p-1" />
                      ) : (
                        <span className="text-text-disabled flex size-12 items-center justify-center text-[10px]">No image</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="text-text-muted block truncate text-[11px]">
                        {product.category?.name ?? "No category"} • {product.id}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    {catalogCategory && <ProductListItemDownloads catalogCategory={catalogCategory} productId={product.id} productName={product.name} />}
                    {product.id === draftSelectedId && <span className="bg-primary-100 rounded px-2 py-0.5 text-[10px] font-semibold">Selected</span>}
                  </span>
                </div>
              ))
            : null}
        </div>
      )}
      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleAccept} disabled={!canAccept}>
          Accept
        </Button>
      </div>
    </Modal>
  );
}
