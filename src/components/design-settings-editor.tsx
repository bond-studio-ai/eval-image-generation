'use client';

import { localUrl } from '@/lib/api-base';
import { INPUT_PRESET_DESIGN_FIELD_KEYS } from '@/lib/input-preset-design';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { SceneImageInput } from '@/components/scene-image-input';
import { withImageParams } from '@/lib/image-utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

type FieldType = 'select' | 'boolean' | 'product';
type CatalogImageTag = 'photo-image' | 'tear-sheet' | 'line-drawing';

interface BaseFieldDef {
  key: string;
  label: string;
  type: FieldType;
}

interface SelectFieldDef extends BaseFieldDef {
  type: 'select';
  options: { value: string; label: string }[];
}

interface BooleanFieldDef extends BaseFieldDef {
  type: 'boolean';
}

interface ProductFieldDef extends BaseFieldDef {
  type: 'product';
  apiCategories: string[];
}

type FieldDef = SelectFieldDef | BooleanFieldDef | ProductFieldDef;
type ProductImageType = 'featured-image' | 'line-drawing' | 'tear-sheet' | 'arbitrary';
type ArbitraryImageMap = Record<string, string | null>;

interface CatalogProduct {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  productFamilyName: string | null;
  featuredImage: { id: string; url: string } | null;
}

const PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'vanity', label: 'Vanity', type: 'product', apiCategories: ['Vanities', 'Linen Cabinets'] },
  { key: 'faucet', label: 'Faucet', type: 'product', apiCategories: ['Faucets', 'Faucet Accessories'] },
  { key: 'mirror', label: 'Mirror', type: 'product', apiCategories: ['Mirror'] },
  { key: 'lighting', label: 'Lighting', type: 'product', apiCategories: ['Decorative Lighting', 'Recessed Lights', 'Light Bulbs'] },
  { key: 'toilet', label: 'Toilet', type: 'product', apiCategories: ['Toilet', 'Toilet Accessories'] },
  { key: 'robeHook', label: 'Robe Hook', type: 'product', apiCategories: ['Robe Hooks'] },
  { key: 'toiletPaperHolder', label: 'Toilet Paper Holder', type: 'product', apiCategories: ['Toilet Paper Holders'] },
  { key: 'towelBar', label: 'Towel Bar', type: 'product', apiCategories: ['Towel Bars'] },
  { key: 'towelRing', label: 'Towel Ring', type: 'product', apiCategories: ['Towel Rings'] },
  { key: 'floorTile', label: 'Floor Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'wallTile', label: 'Wall Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'nicheTile', label: 'Niche Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'showerWallTile', label: 'Shower Wall Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'showerShortWallTile', label: 'Shower Short Wall Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'showerFloorTile', label: 'Shower Floor Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'curbTile', label: 'Curb Tile', type: 'product', apiCategories: ['Tile'] },
  { key: 'paint', label: 'Paint', type: 'product', apiCategories: ['Paint'] },
  { key: 'shelves', label: 'Shelves', type: 'product', apiCategories: ['Shelves'] },
  { key: 'showerSystem', label: 'Shower System', type: 'product', apiCategories: ['Shower Systems', 'Shower System Components'] },
  { key: 'showerGlass', label: 'Shower Glass', type: 'product', apiCategories: ['Shower Glass'] },
  { key: 'tub', label: 'Tub', type: 'product', apiCategories: ['Tubs', 'Tub Accessories', 'Tub Drains'] },
  { key: 'tubDoor', label: 'Tub Door', type: 'product', apiCategories: ['Tub Doors'] },
  { key: 'tubFiller', label: 'Tub Filler', type: 'product', apiCategories: ['Tub Filler'] },
  { key: 'wallpaper', label: 'Wallpaper', type: 'product', apiCategories: ['Wallpaper', 'Wallpaper Accessories'] },
  { key: 'lvp', label: 'LVP', type: 'product', apiCategories: ['LVP'] },
];


const TILE_PATTERN_OPTIONS = [
  { value: 'Horizontal', label: 'Horizontal' },
  { value: 'Vertical', label: 'Vertical' },
  { value: 'Herringbone', label: 'Herringbone' },
  { value: 'Stacked', label: 'Stacked' },
  { value: 'Offset', label: 'Offset' },
  { value: 'HalfOffset', label: 'Half Offset' },
  { value: 'ThirdOffset', label: 'Third Offset' },
  { value: 'Straight', label: 'Straight' },
];

const SETTING_FIELDS: Array<SelectFieldDef | BooleanFieldDef> = [
  {
    key: 'wallpaperPlacement',
    label: 'Wallpaper Placement',
    type: 'select',
    options: [
      { value: 'None', label: 'None' },
      { value: 'AllWalls', label: 'All Walls' },
      { value: 'VanityWall', label: 'Vanity Wall' },
    ],
  },
  {
    key: 'wallTilePlacement',
    label: 'Wall Tile Placement',
    type: 'select',
    options: [
      { value: 'None', label: 'None' },
      { value: 'FullWall', label: 'Full Wall' },
      { value: 'HalfWall', label: 'Half Wall' },
      { value: 'VanityFullWall', label: 'Vanity Full Wall' },
      { value: 'VanityHalfWall', label: 'Vanity Half Wall' },
    ],
  },
  {
    key: 'lightingPlacement',
    label: 'Lighting Placement',
    type: 'select',
    options: [
      { value: 'Above', label: 'Above' },
      { value: 'Side', label: 'Side' },
      { value: 'Ceiling', label: 'Ceiling' },
    ],
  },
  {
    key: 'mirrorPlacement',
    label: 'Mirror Placement',
    type: 'select',
    options: [
      { value: 'CenterOnVanity', label: 'Center on Vanity' },
      { value: 'CenterOnSink', label: 'Center on Sink' },
    ],
  },
  { key: 'floorTilePattern', label: 'Floor Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'wallTilePattern', label: 'Wall Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'nicheTilePattern', label: 'Niche Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'showerWallTilePattern', label: 'Shower Wall Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'showerShortWallTilePattern', label: 'Shower Short Wall Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'showerFloorTilePattern', label: 'Shower Floor Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'curbTilePattern', label: 'Curb Tile Pattern', type: 'select', options: TILE_PATTERN_OPTIONS },
  { key: 'isShowerGlassVisible', label: 'Shower Glass Visible', type: 'boolean' },
  { key: 'isTubDoorVisible', label: 'Tub Door Visible', type: 'boolean' },
];

const FIELDS: FieldDef[] = [...PRODUCT_FIELDS, ...SETTING_FIELDS];
const PRODUCT_IMAGE_TYPE_KEYS = PRODUCT_FIELDS.map((field) => `${field.key}ImageType`);
const ALL_FIELD_KEYS = new Set([...FIELDS.map((field) => field.key), ...PRODUCT_IMAGE_TYPE_KEYS]);
const DEFAULT_PRODUCT_IMAGE_TYPE: ProductImageType = 'featured-image';

const SLOT_TO_CATALOG_CATEGORY: Record<string, string> = {
  floorTile: 'floor-tiles',
  toilet: 'toilets',
  vanity: 'vanities',
  faucet: 'faucets',
  mirror: 'mirrors',
  robeHook: 'robe-hooks',
  toiletPaperHolder: 'toilet-paper-holders',
  towelBar: 'towel-bars',
  towelRing: 'towel-rings',
  lighting: 'lightings',
  nicheTile: 'shower-wall-tiles',
  paint: 'paints',
  shelves: 'shelves',
  showerFloorTile: 'shower-floor-tiles',
  curbTile: 'shower-curb-tiles',
  showerSystem: 'shower-systems',
  showerWallTile: 'shower-wall-tiles',
  showerShortWallTile: 'shower-wall-tiles',
  showerGlass: 'shower-glasses',
  tub: 'tubs',
  tubDoor: 'tub-doors',
  tubFiller: 'tub-fillers',
  wallpaper: 'wallpapers',
  wallTile: 'wall-tiles',
  lvp: 'lvps',
};

function getProductImageTypeKey(slotKey: string): string {
  return `${slotKey}ImageType`;
}

function readProductImageType(value: unknown): ProductImageType | null {
  return value === 'featured-image' || value === 'line-drawing' || value === 'tear-sheet' || value === 'arbitrary'
    ? value
    : null;
}

function isNonEmpty(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'boolean') return true;
  return false;
}

export type DesignSettingsValue = Record<string, unknown> | null;

export function designSettingsHasValues(value: DesignSettingsValue): boolean {
  if (!value) return false;
  return Object.values(value).some(isNonEmpty);
}

interface CatalogImageVariant {
  tag: CatalogImageTag;
  url: string;
}

function useCatalogProductImages(catalogCategory: string | null, productId: string | null) {
  const [images, setImages] = useState<CatalogImageVariant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId || !catalogCategory) { setImages([]); return; }

    let cancelled = false;
    setLoading(true);
    fetch(localUrl(`catalog/products/${catalogCategory}/${productId}`))
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        const product = r.data ?? r;
        const rawImages = Array.isArray(product?.images) ? product.images : [];
        const variants: CatalogImageVariant[] = [];
        const featured = product?.featured_image?.url ?? product?.featuredImage?.url;
        if (featured) variants.push({ tag: 'photo-image', url: featured });
        for (const img of rawImages) {
          if (!img?.url || !img.tag) continue;
          if (img.tag === 'photo-image' && variants.some((v) => v.tag === 'photo-image')) continue;
          if (['photo-image', 'tear-sheet', 'line-drawing'].includes(img.tag)) {
            variants.push({ tag: img.tag, url: img.url });
          }
        }
        setImages(variants);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) { setImages([]); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [catalogCategory, productId]);

  return { images, loading };
}

const IMAGE_TAG_LABELS: Record<CatalogImageTag, string> = {
  'photo-image': 'Featured',
  'tear-sheet': 'Tear Sheet',
  'line-drawing': 'Line Drawing',
};

const IMAGE_TAG_ICON: Record<CatalogImageTag, string> = {
  'photo-image': '📷',
  'tear-sheet': '📋',
  'line-drawing': '✏️',
};

function downloadUrl(url: string, filename: string) {
  const sep = url.includes('?') ? '&' : '?';
  const a = document.createElement('a');
  a.href = `${url}${sep}f=webp`;
  a.download = filename.replace(/\.\w+$/, '.webp');
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const TAG_ICONS: Record<CatalogImageTag, React.ReactNode> = {
  'photo-image': (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
    </svg>
  ),
  'tear-sheet': (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  'line-drawing': (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  ),
};

function ProductImagePreviewModal({ tag, url, productName, onClose }: { tag: CatalogImageTag; url: string; productName: string | null; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const sep = url.includes('?') ? '&' : '?';
  const webpUrl = `${url}${sep}f=webp`;
  const safeName = (productName ?? 'product').replace(/[^a-zA-Z0-9_-]/g, '_');

  return (
    <div
      className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-black/70 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl cursor-default flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-700">
              {productName ?? 'Product'} &mdash; {IMAGE_TAG_LABELS[tag]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadUrl(url, `${safeName}_${tag}.webp`)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
            {!loaded && <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={webpUrl}
              alt={`${productName ?? 'Product'} - ${IMAGE_TAG_LABELS[tag]}`}
              onLoad={() => setLoaded(true)}
              className={`w-full object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'absolute inset-0 opacity-0'}`}
            />
          </div>
        </div>
      </div>
    </div>
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
        className="rounded p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
      >
        {TAG_ICONS[tag]}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100">
        {IMAGE_TAG_LABELS[tag]}
      </span>
      {previewOpen && (
        <ProductImagePreviewModal
          tag={tag}
          url={url}
          productName={productName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function ProductImageDownloadButtons({
  images,
  productId,
  productName,
}: {
  images: CatalogImageVariant[];
  productId: string;
  productName: string | null;
}) {
  return (
    <>
      {(['photo-image', 'tear-sheet', 'line-drawing'] as CatalogImageTag[]).map((tag) => {
        const img = images.find((v) => v.tag === tag);
        if (!img) return null;
        return <ImageTypeIconButton key={tag} tag={tag} url={img.url} productName={productName} />;
      })}
    </>
  );
}

function ProductImageDownloads({ slotKey, productId, productName }: { slotKey: string; productId: string | null; productName: string | null }) {
  const category = slotKey ? SLOT_TO_CATALOG_CATEGORY[slotKey] ?? null : null;
  const { images, loading } = useCatalogProductImages(category, productId);

  if (!productId) return null;
  if (loading) return <div className="mt-1.5 flex gap-1"><span className="animate-pulse text-[10px] text-gray-400">...</span></div>;
  if (images.length === 0) return null;

  return (
    <div className="mt-1.5 flex items-center gap-0.5">
      <ProductImageDownloadButtons images={images} productId={productId} productName={productName} />
    </div>
  );
}

function ProductListItemDownloads({ catalogCategory, productId, productName }: { catalogCategory: string; productId: string; productName: string | null }) {
  const { images, loading } = useCatalogProductImages(catalogCategory, productId);

  if (loading) return null;
  if (images.length === 0) return null;

  return (
    <span className="flex items-center gap-0.5">
      <ProductImageDownloadButtons images={images} productId={productId} productName={productName} />
    </span>
  );
}

export function useCatalogProducts(retailerId?: string) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const query = retailerId ? `?retailerId=${encodeURIComponent(retailerId)}` : '';
    fetch(localUrl(`products${query}`))
      .then((r) => r.json())
      .then((r) => {
        if (cancelled) return;
        setProducts(Array.isArray(r.data) ? (r.data as CatalogProduct[]) : []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [retailerId]);

  const byId = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  return { products, byId, loaded };
}

interface DesignSettingsEditorProps {
  value: DesignSettingsValue;
  onChange: (value: DesignSettingsValue) => void;
  arbitraryImagesBySlot: ArbitraryImageMap;
  onArbitraryImagesBySlotChange: (value: ArbitraryImageMap) => void;
  savedImageUrlsBySlot?: Record<string, string | null>;
  retailerId?: string;
}

export function DesignSettingsEditor({
  value,
  onChange,
  arbitraryImagesBySlot,
  onArbitraryImagesBySlotChange,
  savedImageUrlsBySlot,
  retailerId,
}: DesignSettingsEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { products, byId, loaded } = useCatalogProducts(retailerId);
  const data = value ?? {};

  const setField = useCallback(
    (key: string, nextValue: unknown) => {
      const next = { ...data };
      if (nextValue == null || nextValue === '') delete next[key];
      else next[key] = nextValue;
      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [data, onChange],
  );

  const setProductImageType = useCallback(
    (slotKey: string, nextValue: ProductImageType | null) => {
      const next = { ...data };
      const imageTypeKey = getProductImageTypeKey(slotKey);
      if (nextValue == null) delete next[imageTypeKey];
      else next[imageTypeKey] = nextValue;

      if (nextValue !== 'arbitrary' && arbitraryImagesBySlot[slotKey]) {
        const nextImages = { ...arbitraryImagesBySlot };
        delete nextImages[slotKey];
        onArbitraryImagesBySlotChange(nextImages);
      }

      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [arbitraryImagesBySlot, data, onArbitraryImagesBySlotChange, onChange],
  );

  const filledCount = useMemo(() => FIELDS.filter((field) => isNonEmpty(data[field.key])).length, [data]);
  const extraKeys = useMemo(
    () => Object.keys(data).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(data[key])),
    [data],
  );

  const clearAll = useCallback(() => {
    onChange(null);
    onArbitraryImagesBySlotChange({});
  }, [onArbitraryImagesBySlotChange, onChange]);

  const switchToJson = useCallback(() => {
    const obj = value ?? {};
    setJsonText(Object.keys(obj).length > 0 ? JSON.stringify(obj, null, 2) : '{}');
    setJsonError(null);
    setMode('json');
  }, [value]);

  const switchToForm = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === '' || trimmed === '{}') {
      onChange(null);
      setMode('form');
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object.');
        return;
      }
      const nextImages = Object.fromEntries(
        Object.entries(arbitraryImagesBySlot).filter(
          ([slot, url]) =>
            !!url && (parsed as Record<string, unknown>)[getProductImageTypeKey(slot)] === 'arbitrary'
        )
      );
      onArbitraryImagesBySlotChange(nextImages);
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      setMode('form');
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [arbitraryImagesBySlot, jsonText, onArbitraryImagesBySlotChange, onChange]);

  const applyJson = useCallback(() => {
    const trimmed = jsonText.trim();
    if (trimmed === '' || trimmed === '{}') {
      onChange(null);
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object.');
        return;
      }
      const nextImages = Object.fromEntries(
        Object.entries(arbitraryImagesBySlot).filter(
          ([slot, url]) =>
            !!url && (parsed as Record<string, unknown>)[getProductImageTypeKey(slot)] === 'arbitrary'
        )
      );
      onArbitraryImagesBySlotChange(nextImages);
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [arbitraryImagesBySlot, jsonText, onArbitraryImagesBySlotChange, onChange]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
          {filledCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
              {filledCount} set
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && mode === 'form' && (
            <button
              type="button"
              onClick={clearAll}
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              Clear all
            </button>
          )}
          <div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={mode === 'json' ? switchToForm : undefined}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Form
            </button>
            <button
              type="button"
              onClick={mode === 'form' ? switchToJson : undefined}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === 'json' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {mode === 'form' ? (
        <div className="px-5 py-4">
          <div className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placement & Visibility</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Configure placement, patterns, and visibility settings separately from product selection.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {SETTING_FIELDS.map((field) =>
                  field.type === 'select' ? (
                    <SelectField
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      onChange={(nextValue) => setField(field.key, nextValue)}
                    />
                  ) : (
                    <BooleanField
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      onChange={(nextValue) => setField(field.key, nextValue)}
                    />
                  ),
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product Selection</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Configure each slot from its modal picker.
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {PRODUCT_FIELDS.length} slots
                </span>
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
                    selectedProduct={typeof data[field.key] === 'string' ? byId.get(data[field.key] as string) ?? null : null}
                    arbitraryImagesBySlot={arbitraryImagesBySlot}
                    savedImageUrl={savedImageUrlsBySlot?.[field.key] ?? null}
                    onApplySelection={({ productId, imageType, arbitraryUrl }) => {
                      const next = { ...data };
                      if (productId == null || productId === '') delete next[field.key];
                      else next[field.key] = productId;

                      const imageTypeKey = getProductImageTypeKey(field.key);
                      if (imageType == null) delete next[imageTypeKey];
                      else next[imageTypeKey] = imageType;

                      if (imageType === 'arbitrary') {
                        onArbitraryImagesBySlotChange({
                          ...arbitraryImagesBySlot,
                          [field.key]: arbitraryUrl,
                        });
                      } else if (arbitraryImagesBySlot[field.key]) {
                        const nextImages = { ...arbitraryImagesBySlot };
                        delete nextImages[field.key];
                        onArbitraryImagesBySlotChange(nextImages);
                      }

                      onChange(Object.keys(next).length === 0 ? null : next);
                    }}
                    onClearSelection={() => {
                      const next = { ...data };
                      delete next[field.key];
                      delete next[getProductImageTypeKey(field.key)];
                      if (arbitraryImagesBySlot[field.key]) {
                        const nextImages = { ...arbitraryImagesBySlot };
                        delete nextImages[field.key];
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
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="mb-2 text-xs font-medium text-amber-700">Additional fields (switch to JSON to edit):</p>
              <div className="space-y-1">
                {extraKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-amber-800">{key}</span>
                    <span className="font-mono text-xs text-amber-600">{JSON.stringify(data[key])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5">
          <p className="mb-2 text-xs text-gray-500">Raw JSON with camelCase keys. Switch back to Form to use the structured editor.</p>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            spellCheck={false}
            rows={14}
            className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder={'{\n  "vanity": "00000000-0000-4000-8000-000000000000",\n  "wallTilePlacement": "VanityHalfWall"\n}'}
          />
          {jsonError && <p className="mt-2 text-xs text-red-600">{jsonError}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={applyJson}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Apply JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: SelectFieldDef;
  value: unknown;
  onChange: (value: string | null) => void;
}) {
  const currentValue = typeof value === 'string' ? value : '';
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{field.label}</label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            !currentValue
              ? 'border-gray-300 bg-gray-100 text-gray-700 shadow-sm'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          Not set
        </button>
        {field.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
              currentValue === option.value
                ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BooleanField({
  field,
  value,
  onChange,
}: {
  field: BooleanFieldDef;
  value: unknown;
  onChange: (value: boolean | null) => void;
}) {
  const currentValue = typeof value === 'boolean' ? value : null;
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-700">{field.label}</label>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            currentValue === null
              ? 'border-gray-300 bg-gray-100 text-gray-700 shadow-sm'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          Not set
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            currentValue === true
              ? 'border-green-300 bg-green-50 text-green-700 shadow-sm ring-1 ring-green-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-all ${
            currentValue === false
              ? 'border-red-300 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          No
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
  onClearSelection,
}: {
  field: ProductFieldDef;
  value: unknown;
  imageTypeValue: unknown;
  loaded: boolean;
  products: CatalogProduct[];
  selectedProduct: CatalogProduct | null;
  arbitraryImagesBySlot: ArbitraryImageMap;
  savedImageUrl: string | null;
  onApplySelection: (value: {
    productId: string | null;
    imageType: ProductImageType | null;
    arbitraryUrl: string | null;
  }) => void;
  onClearSelection: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedId = typeof value === 'string' ? value : '';
  const selectedImageType = readProductImageType(imageTypeValue);
  const attachedArbitraryUrl = arbitraryImagesBySlot[field.key] ?? null;
  const previewUrl = attachedArbitraryUrl ?? selectedProduct?.featuredImage?.url ?? savedImageUrl ?? null;
  const hasSelection = !!selectedId || !!selectedImageType || !!attachedArbitraryUrl || !!savedImageUrl;
  const effectiveImageType = selectedImageType ?? DEFAULT_PRODUCT_IMAGE_TYPE;
  const summaryText = selectedProduct
    ? selectedProduct.name
    : attachedArbitraryUrl || savedImageUrl
      ? 'URL-only attachment'
      : 'Not set';

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2.5">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="block w-full text-left"
      >
        <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          {previewUrl ? (
            <ImageWithSkeleton
              src={withImageParams(previewUrl, 1024)}
              alt={field.label}
              loading="lazy"
              wrapperClassName="h-24 w-full bg-gray-50 p-1"
            />
          ) : selectedId && !loaded ? (
            <div className="h-24 w-full animate-pulse bg-gray-200" aria-hidden />
          ) : (
            <div className="flex h-24 items-center justify-center text-[11px] text-gray-400">
              No preview
            </div>
          )}
        </div>
        <div className="mt-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <label className="truncate text-xs font-semibold text-gray-800">{field.label}</label>
            {effectiveImageType === 'arbitrary' && (
              <span className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
                Custom
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[11px] text-gray-600" title={summaryText}>
            {summaryText}
          </p>
          <p className="mt-1 truncate text-[10px] text-gray-400">
            {selectedProduct
              ? selectedProduct.category?.name ?? selectedId
              : savedImageUrl
                ? 'Uses saved URL'
                : attachedArbitraryUrl
                  ? 'Uses arbitrary URL'
                  : 'Open modal to configure'}
          </p>
        </div>
      </button>
      {(selectedId || hasSelection) && (
        <div className="mt-2 flex items-center justify-between">
          {selectedId ? (
            <ProductImageDownloads slotKey={field.key} productId={selectedId} productName={selectedProduct?.name ?? null} />
          ) : <span />}
          {hasSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
            >
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
          selectedProduct={selectedProduct}
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
          onClose={() => setPickerOpen(false)}
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
  selectedProduct,
  imageTypeValue,
  arbitraryUrl,
  savedImageUrl,
  onAccept,
  onClear,
  onClose,
}: {
  field: ProductFieldDef;
  catalogCategory: string | null;
  products: CatalogProduct[];
  loaded: boolean;
  selectedId: string;
  selectedProduct: CatalogProduct | null;
  imageTypeValue: ProductImageType;
  arbitraryUrl: string | null;
  savedImageUrl: string | null;
  onAccept: (value: {
    productId: string | null;
    imageType: ProductImageType | null;
    arbitraryUrl: string | null;
  }) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [draftSelectedId, setDraftSelectedId] = useState(selectedId);
  const [draftImageType, setDraftImageType] = useState<ProductImageType>(imageTypeValue);
  const [draftArbitraryUrl, setDraftArbitraryUrl] = useState<string | null>(arbitraryUrl);

  useEffect(() => {
    setDraftSelectedId(selectedId);
    setDraftImageType(imageTypeValue);
    setDraftArbitraryUrl(arbitraryUrl);
  }, [selectedId, imageTypeValue, arbitraryUrl]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const draftSelectedProduct = useMemo(
    () => products.find((product) => product.id === draftSelectedId) ?? null,
    [products, draftSelectedId]
  );
  const isArbitraryMode = draftImageType === 'arbitrary';
  const canAccept = !isArbitraryMode || !!draftArbitraryUrl;

  const handleAccept = () => {
    if (!canAccept) return;
    onAccept({
      productId: draftSelectedId || null,
      imageType: draftImageType,
      arbitraryUrl: draftImageType === 'arbitrary' ? draftArbitraryUrl : null,
    });
  };

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    return products
      .filter((product) => {
        const categoryName = product.category?.name ?? '';
        if (!field.apiCategories.includes(categoryName)) return false;
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query) ||
          categoryName.toLowerCase().includes(query) ||
          product.id.toLowerCase().includes(query) ||
          product.productFamilyName?.toLowerCase().includes(query)
        );
      })
      .slice(0, 50);
  }, [field.apiCategories, products, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 px-4 py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-900">{field.label}</h3>
            <p className="mt-1 text-xs text-gray-500">
              {isArbitraryMode
                ? draftSelectedId
                  ? 'Upload a custom image to override the product image sent for generation.'
                  : 'Upload a custom image for this slot.'
                : 'Search by product name, category, family, or ID.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedId ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Clear selection
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-4 border-b border-gray-100 p-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current selection</p>
                <p className="mt-1 truncate text-sm font-medium text-gray-800">
                  {draftSelectedProduct
                    ? draftSelectedProduct.name
                    : draftArbitraryUrl || savedImageUrl
                      ? 'URL-only attachment'
                      : 'Not set'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {draftSelectedProduct
                    ? `${draftSelectedProduct.category?.name ?? 'No category'} • ${draftSelectedId}`
                    : savedImageUrl
                      ? 'Saved URL still available even without a product.'
                      : 'Choose a catalog product or use an arbitrary image URL.'}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <label className="flex cursor-pointer items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isArbitraryMode}
                  onClick={() => setDraftImageType(isArbitraryMode ? 'featured-image' : 'arbitrary')}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                    isArbitraryMode ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      isArbitraryMode ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-medium text-gray-600">
                  Use custom image override
                </span>
              </label>
            </div>
            {draftImageType === 'arbitrary' ? (
              <div className="mt-3 rounded-md border border-violet-200 bg-violet-50/40 p-3">
                <SceneImageInput
                  label={draftSelectedId ? 'Override image' : 'Attached arbitrary image'}
                  value={draftArbitraryUrl}
                  onChange={setDraftArbitraryUrl}
                />
              </div>
            ) : null}
          </div>

          {!isArbitraryMode ? (
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={loaded ? `Search ${field.label.toLowerCase()}...` : 'Loading products...'}
              disabled={!loaded}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          ) : null}
        </div>
        {!isArbitraryMode ? (
          <div className="overflow-y-auto">
            {!loaded ? (
              <p className="px-4 py-6 text-sm text-gray-500">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">No matching products.</p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 transition-colors ${
                    product.id === draftSelectedId
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setDraftSelectedId(product.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="shrink-0 overflow-hidden rounded border border-gray-200 bg-white">
                      {product.featuredImage?.url ? (
                        <ImageWithSkeleton
                          src={withImageParams(product.featuredImage.url)}
                          alt={product.name}
                          loading="lazy"
                          wrapperClassName="h-12 w-12 bg-gray-50 p-1"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center text-[10px] text-gray-400">
                          No image
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{product.name}</span>
                      <span className="block truncate text-[11px] text-gray-500">
                        {product.category?.name ?? 'No category'} • {product.id}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    {catalogCategory && (
                      <ProductListItemDownloads catalogCategory={catalogCategory} productId={product.id} productName={product.name} />
                    )}
                    {product.id === draftSelectedId && (
                      <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-semibold">
                        Selected
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!canAccept}
            className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
  hideProductFields?: boolean;
}

const SELECT_OPTION_LABELS = new Map<string, Map<string, string>>();
for (const field of SETTING_FIELDS) {
  if (field.type === 'select') {
    const optionMap = new Map<string, string>();
    for (const option of field.options) optionMap.set(option.value, option.label);
    SELECT_OPTION_LABELS.set(field.key, optionMap);
  }
}

export function DesignSettingsDisplay({ value, hideProductFields = false }: DesignSettingsDisplayProps) {
  const { byId } = useCatalogProducts();
  const populated = FIELDS.filter((field) => isNonEmpty(value[field.key]) && (!hideProductFields || field.type !== 'product'));
  const extraKeys = Object.keys(value).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(value[key]));

  if (populated.length === 0 && extraKeys.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase text-gray-900">Design Settings</h2>
      </div>
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {populated.map((field) => (
            <DisplayField
              key={field.key}
              field={field}
              value={value[field.key]}
              allValues={value}
              productById={byId}
            />
          ))}
        </div>
        {extraKeys.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-medium text-amber-700">Other</p>
            {extraKeys.map((key) => (
              <div key={key} className="flex items-center justify-between py-0.5">
                <span className="font-mono text-xs text-amber-800">{key}</span>
                <span className="font-mono text-xs text-amber-600">{JSON.stringify(value[key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DisplayField({
  field,
  value,
  allValues,
  productById,
}: {
  field: FieldDef;
  value: unknown;
  allValues: Record<string, unknown>;
  productById: Map<string, CatalogProduct>;
}) {
  if (field.type === 'boolean') {
    const boolValue = value as boolean;
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{field.label}</span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            boolValue
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200'
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
          }`}
        >
          {boolValue ? 'Yes' : 'No'}
        </span>
      </div>
    );
  }

  if (field.type === 'product') {
    const productId = String(value);
    const product = productById.get(productId);
    const imageType = readProductImageType(allValues[getProductImageTypeKey(field.key)]);
    const isCustom = imageType === 'arbitrary';
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">{field.label}</span>
        <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
          {product?.name ?? productId}{isCustom ? ' · Custom' : ''}
        </span>
      </div>
    );
  }

  const rawValue = String(value);
  const label = SELECT_OPTION_LABELS.get(field.key)?.get(rawValue) ?? rawValue;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{field.label}</span>
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
        {label}
      </span>
    </div>
  );
}
