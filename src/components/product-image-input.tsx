'use client';

import { type CatalogProduct } from '@/components/product-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PRODUCT_CATEGORIES = [
  { key: 'faucets', label: 'Faucets' },
  { key: 'lightings', label: 'Lightings' },
  { key: 'lvps', label: 'LVPs' },
  { key: 'mirrors', label: 'Mirrors' },
  { key: 'paints', label: 'Paints' },
  { key: 'robe_hooks', label: 'Robe Hooks' },
  { key: 'shelves', label: 'Shelves' },
  { key: 'shower_glasses', label: 'Shower Glasses' },
  { key: 'shower_systems', label: 'Shower Systems' },
  { key: 'floor_tiles', label: 'Floor Tiles' },
  { key: 'wall_tiles', label: 'Wall Tiles' },
  { key: 'shower_wall_tiles', label: 'Shower Wall Tiles' },
  { key: 'shower_floor_tiles', label: 'Shower Floor Tiles' },
  { key: 'shower_curb_tiles', label: 'Shower Curb Tiles' },
  { key: 'toilet_paper_holders', label: 'Toilet Paper Holders' },
  { key: 'toilets', label: 'Toilets' },
  { key: 'towel_bars', label: 'Towel Bars' },
  { key: 'towel_rings', label: 'Towel Rings' },
  { key: 'tub_doors', label: 'Tub Doors' },
  { key: 'tub_fillers', label: 'Tub Fillers' },
  { key: 'tubs', label: 'Tubs' },
  { key: 'vanities', label: 'Vanities' },
  { key: 'wallpapers', label: 'Wallpapers' },
] as const;

/** Map of category_key -> S3 URL */
export type ProductImagesState = Record<string, string | null>;

interface ProductImageInputProps {
  value: ProductImagesState;
  onChange: (value: ProductImagesState) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProductImageInput({ value, onChange }: ProductImageInputProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetch('/api/v1/products')
      .then((r) => r.json())
      .then((r) => {
        setProducts(r.data ?? []);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
  }, []);

  // Get active categories (those with images set)
  const activeCategories = useMemo(() => {
    return Object.entries(value)
      .filter(([, url]) => url)
      .map(([key, url]) => ({
        key,
        label: PRODUCT_CATEGORIES.find((c) => c.key === key)?.label ?? key,
        url: url!,
      }));
  }, [value]);

  // Available categories for adding (those not yet used)
  const availableCategories = useMemo(() => {
    return PRODUCT_CATEGORIES.filter((c) => !value[c.key]);
  }, [value]);

  const removeCategory = useCallback(
    (key: string) => {
      const updated = { ...value };
      delete updated[key];
      onChange(updated);
    },
    [value, onChange],
  );

  const setCategoryImage = useCallback(
    (key: string, url: string) => {
      onChange({ ...value, [key]: url });
    },
    [value, onChange],
  );

  return (
    <div>
      {/* Active product images */}
      {activeCategories.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {activeCategories.map((cat) => (
            <div key={cat.key} className="group relative rounded-lg border border-gray-200 bg-white p-2 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.url}
                alt={cat.label}
                className="h-40 w-full rounded object-contain bg-gray-50"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="truncate text-xs font-medium text-gray-700">{cat.label}</span>
                <button
                  type="button"
                  onClick={() => removeCategory(cat.key)}
                  className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {availableCategories.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Product Image
        </button>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddProductModal
          availableCategories={availableCategories}
          products={products}
          loadingProducts={loadingProducts}
          onAdd={(key, url) => {
            setCategoryImage(key, url);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ------------------------------------
// Add Product Modal
// ------------------------------------

interface AddProductModalProps {
  availableCategories: readonly { key: string; label: string }[];
  products: CatalogProduct[];
  loadingProducts: boolean;
  onAdd: (categoryKey: string, imageUrl: string) => void;
  onClose: () => void;
}

function AddProductModal({
  availableCategories,
  products,
  loadingProducts,
  onAdd,
  onClose,
}: AddProductModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(availableCategories[0]?.key ?? '');
  const [mode, setMode] = useState<'catalog' | 'upload'>('catalog');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter products by search and selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    const catLabel = availableCategories.find((c) => c.key === selectedCategory)?.label ?? '';
    const q = search.toLowerCase().trim();
    return products
      .filter((p) => {
        if (!p.featuredImage?.url) return false;
        // Always filter by selected category first
        const matchesCategory = p.category?.name.toLowerCase().includes(catLabel.toLowerCase());
        if (!matchesCategory) return false;

        // Then apply text search if provided
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.productFamilyName?.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [products, search, selectedCategory, availableCategories]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!res.ok) throw new Error('Upload API unavailable');

      const { uploadUrl, publicUrl } = await res.json().then((r: { data: { uploadUrl: string; publicUrl: string } }) => r.data);

      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!s3Res.ok) throw new Error('S3 PUT failed');
      onAdd(selectedCategory, publicUrl);
    } catch {
      // Fallback: data URL
      try {
        const dataUrl = await fileToDataUrl(file);
        onAdd(selectedCategory, dataUrl);
      } catch {
        // ignore
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">Add Product Image</h3>

        {/* Category selector */}
        <div className="mt-4">
          <label htmlFor="category-select" className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          >
            {availableCategories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('catalog')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'catalog'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            From Catalog
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Custom Upload
          </button>
        </div>

        {/* Catalog mode */}
        {mode === 'catalog' && (
          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={loadingProducts ? 'Loading products...' : 'Search products...'}
              disabled={loadingProducts}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1 disabled:bg-gray-50"
            />
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200">
              {filteredProducts.length === 0 && (
                <div className="p-3 text-center text-sm text-gray-500">
                  {loadingProducts ? 'Loading...' : 'No products found'}
                </div>
              )}
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    if (product.featuredImage?.url) {
                      onAdd(selectedCategory, product.featuredImage.url);
                    }
                  }}
                  className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm transition-colors last:border-0 hover:bg-gray-50"
                >
                  {product.featuredImage?.url && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.featuredImage.url}
                      alt={product.name}
                      className="h-10 w-10 shrink-0 rounded border border-gray-200 object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{product.name}</p>
                    <p className="truncate text-xs text-gray-500">{product.category?.name ?? 'No category'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload mode */}
        {mode === 'upload' && (
          <div className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">Click to upload a custom image</p>
                  <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP, GIF up to 10MB</p>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Close button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
