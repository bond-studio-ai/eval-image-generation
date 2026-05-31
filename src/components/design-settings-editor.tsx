"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { isNonEmpty } from "@/components/design-settings-values";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { SceneImageInput } from "@/components/scene-image-input";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileTextIcon, ImageIcon, PencilIcon, XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { localUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { catalogProductImagesResponseSchema } from "@/lib/api/schemas";

type FieldType = "select" | "boolean" | "product";
type CatalogImageTag = "photo-image" | "tear-sheet" | "line-drawing";

interface BaseFieldDef {
  key: string;
  label: string;
  type: FieldType;
}

interface SelectFieldDef extends BaseFieldDef {
  type: "select";
  options: { value: string; label: string }[];
}

interface BooleanFieldDef extends BaseFieldDef {
  type: "boolean";
}

interface ProductFieldDef extends BaseFieldDef {
  type: "product";
  apiCategories: string[];
}

type FieldDef = SelectFieldDef | BooleanFieldDef | ProductFieldDef;
type ProductImageType = "featured-image" | "line-drawing" | "tear-sheet" | "arbitrary";
type ArbitraryImageMap = Record<string, string | null>;

interface CatalogProduct {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  productFamilyName: string | null;
  featuredImage: { id: string; url: string } | null;
}

const PRODUCT_FIELDS: ProductFieldDef[] = [
  {
    key: "vanity",
    label: "Vanity",
    type: "product",
    apiCategories: ["Vanities", "Linen Cabinets"]
  },
  {
    key: "faucet",
    label: "Faucet",
    type: "product",
    apiCategories: ["Faucets", "Faucet Accessories"]
  },
  { key: "mirror", label: "Mirror", type: "product", apiCategories: ["Mirror"] },
  {
    key: "lighting",
    label: "Lighting",
    type: "product",
    apiCategories: ["Decorative Lighting", "Recessed Lights", "Light Bulbs"]
  },
  {
    key: "toilet",
    label: "Toilet",
    type: "product",
    apiCategories: ["Toilet", "Toilet Accessories"]
  },
  { key: "robeHook", label: "Robe Hook", type: "product", apiCategories: ["Robe Hooks"] },
  {
    key: "toiletPaperHolder",
    label: "Toilet Paper Holder",
    type: "product",
    apiCategories: ["Toilet Paper Holders"]
  },
  { key: "towelBar", label: "Towel Bar", type: "product", apiCategories: ["Towel Bars"] },
  { key: "towelRing", label: "Towel Ring", type: "product", apiCategories: ["Towel Rings"] },
  { key: "floorTile", label: "Floor Tile", type: "product", apiCategories: ["Tile"] },
  { key: "wallTile", label: "Wall Tile", type: "product", apiCategories: ["Tile"] },
  { key: "nicheTile", label: "Niche Tile", type: "product", apiCategories: ["Tile"] },
  { key: "showerWallTile", label: "Shower Wall Tile", type: "product", apiCategories: ["Tile"] },
  {
    key: "showerShortWallTile",
    label: "Shower Short Wall Tile",
    type: "product",
    apiCategories: ["Tile"]
  },
  { key: "showerFloorTile", label: "Shower Floor Tile", type: "product", apiCategories: ["Tile"] },
  { key: "curbTile", label: "Curb Tile", type: "product", apiCategories: ["Tile"] },
  { key: "paint", label: "Paint", type: "product", apiCategories: ["Paint"] },
  { key: "shelves", label: "Shelves", type: "product", apiCategories: ["Shelves"] },
  {
    key: "showerSystem",
    label: "Shower System",
    type: "product",
    apiCategories: ["Shower Systems", "Shower System Components"]
  },
  { key: "showerGlass", label: "Shower Glass", type: "product", apiCategories: ["Shower Glass"] },
  {
    key: "tub",
    label: "Tub",
    type: "product",
    apiCategories: ["Tubs", "Tub Accessories", "Tub Drains"]
  },
  { key: "tubDoor", label: "Tub Door", type: "product", apiCategories: ["Tub Doors"] },
  { key: "tubFiller", label: "Tub Filler", type: "product", apiCategories: ["Tub Filler"] },
  {
    key: "wallpaper",
    label: "Wallpaper",
    type: "product",
    apiCategories: ["Wallpaper", "Wallpaper Accessories"]
  },
  { key: "lvp", label: "LVP", type: "product", apiCategories: ["LVP"] }
];

const TILE_PATTERN_OPTIONS = [
  { value: "Horizontal", label: "Horizontal" },
  { value: "Vertical", label: "Vertical" },
  { value: "Herringbone", label: "Herringbone" },
  { value: "Stacked", label: "Stacked" },
  { value: "Offset", label: "Offset" },
  { value: "HalfOffset", label: "Half Offset" },
  { value: "ThirdOffset", label: "Third Offset" },
  { value: "Straight", label: "Straight" }
];

const SETTING_FIELDS: (SelectFieldDef | BooleanFieldDef)[] = [
  {
    key: "wallpaperPlacement",
    label: "Wallpaper Placement",
    type: "select",
    options: [
      { value: "None", label: "None" },
      { value: "AllWalls", label: "All Walls" },
      { value: "VanityWall", label: "Vanity Wall" }
    ]
  },
  {
    key: "wallTilePlacement",
    label: "Wall Tile Placement",
    type: "select",
    options: [
      { value: "None", label: "None" },
      { value: "FullWall", label: "Full Wall" },
      { value: "HalfWall", label: "Half Wall" },
      { value: "VanityFullWall", label: "Vanity Full Wall" },
      { value: "VanityHalfWall", label: "Vanity Half Wall" }
    ]
  },
  {
    key: "lightingPlacement",
    label: "Lighting Placement",
    type: "select",
    options: [
      { value: "Above", label: "Above" },
      { value: "Side", label: "Side" },
      { value: "Ceiling", label: "Ceiling" }
    ]
  },
  {
    key: "mirrorPlacement",
    label: "Mirror Placement",
    type: "select",
    options: [
      { value: "CenterOnVanity", label: "Center on Vanity" },
      { value: "CenterOnSink", label: "Center on Sink" }
    ]
  },
  {
    key: "floorTilePattern",
    label: "Floor Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "wallTilePattern",
    label: "Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "nicheTilePattern",
    label: "Niche Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerWallTilePattern",
    label: "Shower Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerShortWallTilePattern",
    label: "Shower Short Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerFloorTilePattern",
    label: "Shower Floor Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "curbTilePattern",
    label: "Curb Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  { key: "isShowerGlassVisible", label: "Shower Glass Visible", type: "boolean" },
  { key: "isTubDoorVisible", label: "Tub Door Visible", type: "boolean" }
];

const FIELDS: FieldDef[] = [...PRODUCT_FIELDS, ...SETTING_FIELDS];
const PRODUCT_IMAGE_TYPE_KEYS = PRODUCT_FIELDS.map((field) => `${field.key}ImageType`);
const ALL_FIELD_KEYS = new Set([...FIELDS.map((field) => field.key), ...PRODUCT_IMAGE_TYPE_KEYS]);
const DEFAULT_PRODUCT_IMAGE_TYPE: ProductImageType = "featured-image";

const SLOT_TO_CATALOG_CATEGORY: Record<string, string> = {
  floorTile: "floor-tiles",
  toilet: "toilets",
  vanity: "vanities",
  faucet: "faucets",
  mirror: "mirrors",
  robeHook: "robe-hooks",
  toiletPaperHolder: "toilet-paper-holders",
  towelBar: "towel-bars",
  towelRing: "towel-rings",
  lighting: "lightings",
  nicheTile: "shower-wall-tiles",
  paint: "paints",
  shelves: "shelves",
  showerFloorTile: "shower-floor-tiles",
  curbTile: "shower-curb-tiles",
  showerSystem: "shower-systems",
  showerWallTile: "shower-wall-tiles",
  showerShortWallTile: "shower-wall-tiles",
  showerGlass: "shower-glasses",
  tub: "tubs",
  tubDoor: "tub-doors",
  tubFiller: "tub-fillers",
  wallpaper: "wallpapers",
  wallTile: "wall-tiles",
  lvp: "lvps"
};

function getProductImageTypeKey(slotKey: string): string {
  return `${slotKey}ImageType`;
}

function readProductImageType(value: unknown): ProductImageType | null {
  return value === "featured-image" || value === "line-drawing" || value === "tear-sheet" || value === "arbitrary" ? value : null;
}

export type DesignSettingsValue = Record<string, unknown> | null;

interface CatalogImageVariant {
  tag: CatalogImageTag;
  url: string;
}

const DOWNLOADABLE_IMAGE_TAGS = new Set<string>(["line-drawing", "photo-image", "tear-sheet"]);

function useCatalogProductImages(catalogCategory: string | null, productId: string | null) {
  const { data: images = [], isLoading } = useQuery({
    queryKey: ["catalog-product-images", catalogCategory, productId],
    queryFn: async ({ signal }) => {
      const json = await fetchJson(localUrl(`catalog/products/${catalogCategory ?? ""}/${productId ?? ""}`), catalogProductImagesResponseSchema, { signal });
      const product = json.data;
      const variants: CatalogImageVariant[] = [];
      const featured = product?.featuredImage?.url;
      if (featured) variants.push({ tag: "photo-image", url: featured });
      for (const img of product?.images ?? []) {
        if (!img.url || !img.tag) continue;
        if (img.tag === "photo-image" && variants.some((variant) => variant.tag === "photo-image")) continue;
        if (DOWNLOADABLE_IMAGE_TAGS.has(img.tag)) {
          variants.push({ tag: img.tag as CatalogImageTag, url: img.url });
        }
      }
      return variants;
    },
    enabled: Boolean(productId) && Boolean(catalogCategory)
  });

  return { images, loading: isLoading };
}

const IMAGE_TAG_LABELS: Record<CatalogImageTag, string> = {
  "photo-image": "Featured",
  "tear-sheet": "Tear Sheet",
  "line-drawing": "Line Drawing"
};

function downloadUrl(url: string, filename: string) {
  const sep = url.includes("?") ? "&" : "?";
  const a = document.createElement("a");
  a.href = `${url}${sep}f=webp`;
  a.download = filename.replace(/\.\w+$/, ".webp");
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.append(a);
  a.click();
  a.remove();
}

const TAG_ICONS: Record<CatalogImageTag, React.ReactNode> = {
  "photo-image": <ImageIcon className="size-3.5" />,
  "tear-sheet": <FileTextIcon className="size-3.5" />,
  "line-drawing": <PencilIcon className="size-3.5" />
};

function ProductImagePreviewModal({ tag, url, productName, onClose }: { tag: CatalogImageTag; url: string; productName: string | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const safeName = (productName ?? "product").replaceAll(/[^\w-]/g, "_");

  return (
    <Modal
      onClose={onClose}
      labelledById="product-image-preview-title"
      backdropClassName="bg-overlay/70"
      containerClassName="z-[60] sm:p-6"
      className="bg-surface relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl shadow-2xl"
    >
      <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span id="product-image-preview-title" className="text-text-secondary text-body truncate font-medium">
            {productName ?? "Product"} &mdash; {IMAGE_TAG_LABELS[tag]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadUrl(url, `${safeName}_${tag}.webp`);
            }}
            className="border-border text-text-secondary hover:bg-surface-muted text-caption inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium transition-colors"
          >
            <DownloadIcon className="size-3.5" />
            Download
          </button>
          <button type="button" aria-label="Close image preview" onClick={onClose} className="bg-surface-sunken text-text-secondary hover:bg-border rounded-full p-1.5">
            <XIcon className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-surface-sunken relative w-full overflow-hidden rounded-lg">
          {!loaded && <div className="bg-border aspect-[4/3] w-full animate-pulse" />}
          <CdnImage
            src={url}
            alt={`${productName ?? "Product"} - ${IMAGE_TAG_LABELS[tag]}`}
            width={0}
            height={0}
            sizes="100vw"
            onLoad={() => {
              setLoaded(true);
            }}
            className={`h-auto w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "absolute inset-0 opacity-0"}`}
          />
        </div>
      </div>
    </Modal>
  );
}

function ImageTypeIconButton({ tag, url, productName }: { tag: CatalogImageTag; url: string; productName: string | null }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="group/tip relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setPreviewOpen(true);
        }}
        className="text-text-disabled hover:bg-surface-sunken hover:text-primary-600 rounded p-1 transition-colors"
      >
        {TAG_ICONS[tag]}
      </button>
      <span className="text-text-inverse bg-text-primary pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded px-2 py-1 text-[10px] font-medium whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100">
        {IMAGE_TAG_LABELS[tag]}
      </span>
      {previewOpen && (
        <ProductImagePreviewModal
          tag={tag}
          url={url}
          productName={productName}
          onClose={() => {
            setPreviewOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ProductImageDownloadButtons({ images, productName }: { images: CatalogImageVariant[]; productName: string | null }) {
  return (
    <>
      {(["photo-image", "tear-sheet", "line-drawing"] as CatalogImageTag[]).map((tag) => {
        const img = images.find((variant) => variant.tag === tag);
        if (!img) return null;
        return <ImageTypeIconButton key={tag} tag={tag} url={img.url} productName={productName} />;
      })}
    </>
  );
}

function ProductImageDownloads({ slotKey, productId, productName }: { slotKey: string; productId: string | null; productName: string | null }) {
  const category = slotKey ? (SLOT_TO_CATALOG_CATEGORY[slotKey] ?? null) : null;
  const { images, loading } = useCatalogProductImages(category, productId);

  if (!productId) return null;
  if (loading)
    return (
      <div className="mt-1.5 flex gap-1">
        <span className="text-text-disabled animate-pulse text-[10px]">...</span>
      </div>
    );
  if (images.length === 0) return null;

  return (
    <div className="mt-1.5 flex items-center gap-0.5">
      <ProductImageDownloadButtons images={images} productName={productName} />
    </div>
  );
}

function ProductListItemDownloads({ catalogCategory, productId, productName }: { catalogCategory: string; productId: string; productName: string | null }) {
  const { images, loading } = useCatalogProductImages(catalogCategory, productId);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <span className="flex items-center gap-0.5">
      <ProductImageDownloadButtons images={images} productName={productName} />
    </span>
  );
}

export function useCatalogProducts(retailerId?: string) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["catalog-products", retailerId],
    queryFn: async ({ signal }) => {
      const query = retailerId ? `?retailerId=${encodeURIComponent(retailerId)}` : "";
      const res = await fetch(localUrl(`products${query}`), { signal });
      if (!res.ok) throw new Error(`Failed to fetch catalog products (${res.status})`);
      const json = (await res.json()) as { data?: unknown };
      return Array.isArray(json.data) ? (json.data as CatalogProduct[]) : [];
    }
  });

  const byId = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  return { products, byId, loaded: !isLoading };
}

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
  const summaryText = selectedProduct ? selectedProduct.name : attachedArbitraryUrl || savedImageUrl ? "URL-only attachment" : "Not set";

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
          {previewUrl ? (
            <ImageWithSkeleton src={previewUrl} alt={field.label} wrapperClassName="h-24 w-full bg-surface-muted p-1" />
          ) : selectedId && !loaded ? (
            <div className="bg-border h-24 w-full animate-pulse" aria-hidden />
          ) : (
            <div className="text-text-disabled flex h-24 items-center justify-center text-[11px]">No preview</div>
          )}
        </div>
        <div className="mt-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <label className="text-text-secondary text-caption truncate font-semibold">{field.label}</label>
            {effectiveImageType === "arbitrary" && <span className="bg-accent-50 text-accent-700 ring-accent-200 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset">Custom</span>}
          </div>
          <p className="text-text-secondary mt-1 truncate text-[11px]" title={summaryText}>
            {summaryText}
          </p>
          <p className="text-text-disabled mt-1 truncate text-[10px]">
            {selectedProduct ? (selectedProduct.category?.name ?? selectedId) : savedImageUrl ? "Uses saved URL" : attachedArbitraryUrl ? "Uses arbitrary URL" : "Open modal to configure"}
          </p>
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

function ProductSelectionModal({
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
      .slice(0, 50);
  }, [field.apiCategories, products, search]);

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
          <p className="text-text-muted text-caption mt-1">
            {isArbitraryMode ? (draftSelectedId ? "Upload a custom image to override the product image sent for generation." : "Upload a custom image for this slot.") : "Search by product name, category, family, or ID."}
          </p>
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
              <p className="text-text-secondary text-body mt-1 truncate font-medium">{draftSelectedProduct ? draftSelectedProduct.name : draftArbitraryUrl || savedImageUrl ? "URL-only attachment" : "Not set"}</p>
              <p className="text-text-muted text-caption mt-1">
                {draftSelectedProduct
                  ? `${draftSelectedProduct.category?.name ?? "No category"} • ${draftSelectedId}`
                  : savedImageUrl
                    ? "Saved URL still available even without a product."
                    : "Choose a catalog product or use an arbitrary image URL."}
              </p>
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
          {loaded ? (
            filteredProducts.length === 0 ? (
              <p className="text-text-muted text-body px-4 py-6">No matching products.</p>
            ) : (
              filteredProducts.map((product) => (
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
            )
          ) : (
            <p className="text-text-muted text-body px-4 py-6">Loading products…</p>
          )}
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

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
  hideProductFields?: boolean;
}

const SELECT_OPTION_LABELS = new Map<string, Map<string, string>>();
for (const field of SETTING_FIELDS) {
  if (field.type === "select") {
    const optionMap = new Map<string, string>();
    for (const option of field.options) optionMap.set(option.value, option.label);
    SELECT_OPTION_LABELS.set(field.key, optionMap);
  }
}

export function DesignSettingsDisplay({ value, hideProductFields = false }: DesignSettingsDisplayProps) {
  const { byId } = useCatalogProducts();
  const populated = FIELDS.filter((field) => isNonEmpty(value[field.key]) && (!hideProductFields || field.type !== "product"));
  const extraKeys = Object.keys(value).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(value[key]));

  if (populated.length === 0 && extraKeys.length === 0) return null;

  return (
    <div className="border-border bg-surface rounded-lg border shadow-xs">
      <div className="border-border-subtle border-b px-5 py-3">
        <h2 className="text-text-primary text-body font-semibold uppercase">Design Settings</h2>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {populated.map((field) => (
            <DisplayField key={field.key} field={field} value={value[field.key]} allValues={value} productById={byId} />
          ))}
        </div>
        {extraKeys.length > 0 && (
          <div className="border-warning-200 bg-warning-50 mt-4 rounded-md border px-4 py-3">
            <p className="text-warning-700 text-caption mb-1 font-medium">Other</p>
            {extraKeys.map((key) => (
              <div key={key} className="flex items-center justify-between py-0.5">
                <span className="text-warning-800 text-caption font-mono">{key}</span>
                <span className="text-warning-600 text-caption font-mono">{JSON.stringify(value[key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayField({ field, value, allValues, productById }: { field: FieldDef; value: unknown; allValues: Record<string, unknown>; productById: Map<string, CatalogProduct> }) {
  if (field.type === "boolean") {
    const boolValue = value as boolean;
    return (
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-body">{field.label}</span>
        <span
          className={`text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${boolValue ? "bg-success-50 text-success-700 ring-success-200 ring-1 ring-inset" : "bg-danger-50 text-danger-700 ring-danger-200 ring-1 ring-inset"}`}
        >
          {boolValue ? "Yes" : "No"}
        </span>
      </div>
    );
  }

  if (field.type === "product") {
    const productId = String(value);
    const product = productById.get(productId);
    const imageType = readProductImageType(allValues[getProductImageTypeKey(field.key)]);
    const isCustom = imageType === "arbitrary";
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-text-secondary text-body">{field.label}</span>
        <span className="bg-accent-50 text-accent-700 ring-accent-200 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">
          {product?.name ?? productId}
          {isCustom ? " · Custom" : ""}
        </span>
      </div>
    );
  }

  const rawValue = String(value);
  const label = SELECT_OPTION_LABELS.get(field.key)?.get(rawValue) ?? rawValue;
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary text-body">{field.label}</span>
      <span className="bg-primary-50 text-primary-700 ring-primary-200 text-caption inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ring-1 ring-inset">{label}</span>
    </div>
  );
}
