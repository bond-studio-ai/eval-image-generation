import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import type { ProductImageGroup } from "./types";

export function ProductImagesSection({ productImages }: { productImages: ProductImageGroup[] }) {
  if (productImages.length === 0) return null;

  return (
    <div id="section-products" className="mt-8 scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Product Images</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {productImages.map((img) => (
          <div key={img.key} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
            {img.urls.length === 1 ? (
              <ImageWithSkeleton src={img.urls[0]} alt={img.label} wrapperClassName="h-44 w-full bg-gray-50" />
            ) : (
              <div className="grid grid-cols-2 gap-0.5 p-1">
                {img.urls.map((url, i) => (
                  <ImageWithSkeleton key={url} src={url} alt={`${img.label} ${i + 1}`} wrapperClassName="h-20 w-full rounded bg-gray-50" />
                ))}
              </div>
            )}
            <div className="p-2">
              <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {img.label}
                {img.urls.length > 1 && ` (${img.urls.length})`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
