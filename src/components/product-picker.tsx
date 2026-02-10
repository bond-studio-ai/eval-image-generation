'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { withImageParams } from '@/lib/image-utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface CatalogProduct {
  id: string;
  name: string;
  preferredRetailer: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  productFamilyName: string | null;
  featuredImage: { id: string; url: string } | null;
}

export interface SelectedProduct {
  id: string;
  name: string;
  categoryName: string | null;
  imageUrl: string;
}

interface ProductPickerProps {
  selectedProducts: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
}

export function ProductPicker({ selectedProducts, onProductsChange }: ProductPickerProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch products on mount
  useEffect(() => {
    fetch('/api/v1/products')
      .then((r) => r.json())
      .then((r) => {
        setProducts(r.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        setLoading(false);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 50); // Show first 50 when no search

    const q = search.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.productFamilyName?.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [products, search]);

  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((p) => p.id)),
    [selectedProducts],
  );

  const addProduct = useCallback(
    (product: CatalogProduct) => {
      if (!product.featuredImage?.url || selectedIds.has(product.id)) return;

      const selected: SelectedProduct = {
        id: product.id,
        name: product.name,
        categoryName: product.category?.name ?? null,
        imageUrl: product.featuredImage.url,
      };

      onProductsChange([...selectedProducts, selected]);
      setSearch('');
      setShowDropdown(false);
    },
    [selectedProducts, selectedIds, onProductsChange],
  );

  const removeProduct = useCallback(
    (productId: string) => {
      onProductsChange(selectedProducts.filter((p) => p.id !== productId));
    },
    [selectedProducts, onProductsChange],
  );

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Select products from catalog
      </label>

      {/* Search input */}
      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={loading ? 'Loading products...' : 'Search by name, category, or product ID...'}
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500"
        />

        {/* Dropdown */}
        {showDropdown && !loading && (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {error && (
              <div className="p-3 text-sm text-red-600">{error}</div>
            )}
            {filteredProducts.length === 0 && !error && (
              <div className="p-3 text-sm text-gray-500">
                {search ? 'No products match your search.' : 'No products available.'}
              </div>
            )}
            {filteredProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const hasImage = !!product.featuredImage?.url;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isSelected || !hasImage}
                  onClick={() => addProduct(product)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'cursor-default bg-gray-50 text-gray-400'
                      : !hasImage
                        ? 'cursor-not-allowed text-gray-400'
                        : 'hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  {product.featuredImage?.url ? (
                    <ImageWithSkeleton
                      src={withImageParams(product.featuredImage.url)}
                      alt={product.name}
                      loading="lazy"
                      wrapperClassName="h-10 w-10 shrink-0 rounded border border-gray-200"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {product.category?.name ?? 'No category'}
                      {isSelected && ' — Already selected'}
                      {!hasImage && ' — No image'}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredProducts.length >= 50 && (
              <div className="border-t border-gray-100 p-2 text-center text-xs text-gray-500">
                Showing first 50 results. Refine your search for more.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {selectedProducts.map((product) => (
            <div key={product.id} className="group relative">
              <ImageWithSkeleton
                src={withImageParams(product.imageUrl)}
                alt={product.name}
                loading="lazy"
                wrapperClassName="h-24 w-full rounded-lg border border-gray-200"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="absolute -top-2 -right-2 hidden rounded-full bg-red-500 p-1 text-white shadow-sm group-hover:block"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <p className="mt-1 truncate text-xs text-gray-600" title={product.name}>
                {product.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
