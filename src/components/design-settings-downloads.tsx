"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import { type CatalogImageTag, SLOT_TO_CATALOG_CATEGORY } from "@/components/design-settings-fields";
import { DownloadIcon, FileTextIcon, ImageIcon, PencilIcon, XIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { localUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { catalogProductImagesResponseSchema } from "@/lib/api/schemas";

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

export function ProductImageDownloads({ slotKey, productId, productName }: { slotKey: string; productId: string | null; productName: string | null }) {
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

export function ProductListItemDownloads({ catalogCategory, productId, productName }: { catalogCategory: string; productId: string; productName: string | null }) {
  const { images, loading } = useCatalogProductImages(catalogCategory, productId);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <span className="flex items-center gap-0.5">
      <ProductImageDownloadButtons images={images} productName={productName} />
    </span>
  );
}
