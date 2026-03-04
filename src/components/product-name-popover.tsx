'use client';

import { type CatalogProduct } from '@/components/product-picker';
import { localUrl } from '@/lib/api-base';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function extractProductId(url: string): string | null {
  const m = url.match(/\/products\/([0-9a-f-]{36})\//i);
  return m?.[1] ?? null;
}

let cachedProducts: CatalogProduct[] | null = null;
let fetchPromise: Promise<CatalogProduct[]> | null = null;

function fetchProductsCached(): Promise<CatalogProduct[]> {
  if (cachedProducts) return Promise.resolve(cachedProducts);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch(localUrl('products'))
    .then((r) => r.json())
    .then((r) => {
      cachedProducts = r.data ?? [];
      fetchPromise = null;
      return cachedProducts!;
    })
    .catch(() => {
      fetchPromise = null;
      return [] as CatalogProduct[];
    });
  return fetchPromise;
}

export function useProductNameLookup() {
  const [products, setProducts] = useState<CatalogProduct[]>(cachedProducts ?? []);

  useEffect(() => {
    fetchProductsCached().then(setProducts);
  }, []);

  const lookup = useMemo(() => {
    const byUrl = new Map<string, string>();
    const byId = new Map<string, string>();
    for (const p of products) {
      if (p.featuredImage?.url) byUrl.set(p.featuredImage.url, p.name);
      byId.set(p.id, p.name);
    }
    return { byUrl, byId };
  }, [products]);

  return useCallback(
    (url: string): string | null => {
      const direct = lookup.byUrl.get(url);
      if (direct) return direct;
      const pid = extractProductId(url);
      if (pid) return lookup.byId.get(pid) ?? null;
      return null;
    },
    [lookup],
  );
}

interface ProductNamePopoverProps {
  imageUrl: string;
  getProductName: (url: string) => string | null;
  children: React.ReactNode;
  className?: string;
}

export function ProductNamePopover({ imageUrl, getProductName, children, className }: ProductNamePopoverProps) {
  const name = getProductName(imageUrl);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (!name) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 200);
  }, [name]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 100);
  }, []);

  const keepOpen = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (!name) {
    return <div className={className}>{children}</div>;
  }

  const anchor = triggerRef.current?.getBoundingClientRect();

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className={className}
      >
        {children}
      </div>
      {open && anchor && createPortal(
        <PopoverCard
          name={name}
          anchorTop={anchor.top - 4}
          anchorCenterX={anchor.left + anchor.width / 2}
          onMouseEnter={keepOpen}
          onMouseLeave={hide}
        />,
        document.body,
      )}
    </>
  );
}

interface PopoverCardProps {
  name: string;
  anchorTop: number;
  anchorCenterX: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const PopoverCard = forwardRef<HTMLDivElement, PopoverCardProps>(
  function PopoverCard({ name, anchorTop, anchorCenterX, onMouseEnter, onMouseLeave }, ref) {
    const innerRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed' });

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;

      let left = anchorCenterX - rect.width / 2;
      if (left + rect.width > vw - 8) left = vw - rect.width - 8;
      if (left < 8) left = 8;

      let top = anchorTop - rect.height;
      if (top < 8) top = anchorTop + 40;

      setStyle({ position: 'fixed', top, left, zIndex: 9999 });
    }, [anchorTop, anchorCenterX]);

    return (
      <div
        ref={(node) => {
          (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-xl"
        style={style}
      >
        <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{name}</p>
      </div>
    );
  },
);
