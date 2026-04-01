'use client';

import { localUrl } from '@/lib/api-base';
import { INPUT_PRESET_DESIGN_FIELD_KEYS } from '@/lib/input-preset-design';
import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { SceneImageInput } from '@/components/scene-image-input';
import { withImageParams } from '@/lib/image-utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

type FieldType = 'select' | 'boolean' | 'product';

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
type ArbitraryImageAttachment = { url: string; slot: string } | null;

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
];

const PRODUCT_IMAGE_TYPE_OPTIONS: Array<{ value: ProductImageType; label: string }> = [
  { value: 'featured-image', label: 'Featured Image' },
  { value: 'line-drawing', label: 'Line Drawing' },
  { value: 'tear-sheet', label: 'Tear Sheet' },
  { value: 'arbitrary', label: 'Arbitrary' },
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
  { key: 'isShowerGlassVisible', label: 'Shower Glass Visible', type: 'boolean' },
  { key: 'isTubDoorVisible', label: 'Tub Door Visible', type: 'boolean' },
];

const FIELDS: FieldDef[] = [...PRODUCT_FIELDS, ...SETTING_FIELDS];
const PRODUCT_IMAGE_TYPE_KEYS = PRODUCT_FIELDS.map((field) => `${field.key}ImageType`);
const ALL_FIELD_KEYS = new Set([...FIELDS.map((field) => field.key), ...PRODUCT_IMAGE_TYPE_KEYS]);

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

function useCatalogProducts() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(localUrl('products'))
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
  }, []);

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
  arbitraryImage: ArbitraryImageAttachment;
  onArbitraryImageChange: (value: ArbitraryImageAttachment) => void;
  savedImageUrlsBySlot?: Record<string, string | null>;
}

export function DesignSettingsEditor({
  value,
  onChange,
  arbitraryImage,
  onArbitraryImageChange,
  savedImageUrlsBySlot,
}: DesignSettingsEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { products, byId, loaded } = useCatalogProducts();
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

      if (nextValue === 'arbitrary') {
        for (const field of PRODUCT_FIELDS) {
          if (field.key === slotKey) continue;
          const otherImageTypeKey = getProductImageTypeKey(field.key);
          if (next[otherImageTypeKey] === 'arbitrary') {
            delete next[otherImageTypeKey];
          }
        }
        if (arbitraryImage?.slot && arbitraryImage.slot !== slotKey) {
          onArbitraryImageChange(null);
        }
      } else if (arbitraryImage?.slot === slotKey) {
        onArbitraryImageChange(null);
      }

      onChange(Object.keys(next).length === 0 ? null : next);
    },
    [arbitraryImage, data, onArbitraryImageChange, onChange],
  );

  const filledCount = useMemo(() => FIELDS.filter((field) => isNonEmpty(data[field.key])).length, [data]);
  const extraKeys = useMemo(
    () => Object.keys(data).filter((key) => !ALL_FIELD_KEYS.has(key) && isNonEmpty(data[key])),
    [data],
  );

  const clearAll = useCallback(() => {
    onChange(null);
    onArbitraryImageChange(null);
  }, [onArbitraryImageChange, onChange]);

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
      if (
        arbitraryImage &&
        (parsed as Record<string, unknown>)[getProductImageTypeKey(arbitraryImage.slot)] !== 'arbitrary'
      ) {
        onArbitraryImageChange(null);
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
      setMode('form');
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [arbitraryImage, jsonText, onArbitraryImageChange, onChange]);

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
      if (
        arbitraryImage &&
        (parsed as Record<string, unknown>)[getProductImageTypeKey(arbitraryImage.slot)] !== 'arbitrary'
      ) {
        onArbitraryImageChange(null);
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON.');
    }
  }, [arbitraryImage, jsonText, onArbitraryImageChange, onChange]);

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
            <section className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
              <div className="mb-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product Selection</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Choose products and decide which image variant should be sent for each one.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {PRODUCT_FIELDS.map((field) => (
                  <ProductField
                    key={field.key}
                    field={field}
                    value={data[field.key]}
                    imageTypeValue={data[getProductImageTypeKey(field.key)]}
                    loaded={loaded}
                    products={products}
                    selectedProduct={typeof data[field.key] === 'string' ? byId.get(data[field.key] as string) ?? null : null}
                    arbitraryImage={arbitraryImage}
                    savedImageUrl={savedImageUrlsBySlot?.[field.key] ?? null}
                    onChange={(nextValue) => setField(field.key, nextValue)}
                    onImageTypeChange={(nextValue) => setProductImageType(field.key, nextValue)}
                    onArbitraryImageChange={onArbitraryImageChange}
                  />
                ))}
              </div>
            </section>

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
  arbitraryImage,
  savedImageUrl,
  onChange,
  onImageTypeChange,
  onArbitraryImageChange,
}: {
  field: ProductFieldDef;
  value: unknown;
  imageTypeValue: unknown;
  loaded: boolean;
  products: CatalogProduct[];
  selectedProduct: CatalogProduct | null;
  arbitraryImage: ArbitraryImageAttachment;
  savedImageUrl: string | null;
  onChange: (value: string | null) => void;
  onImageTypeChange: (value: ProductImageType | null) => void;
  onArbitraryImageChange: (value: ArbitraryImageAttachment) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedId = typeof value === 'string' ? value : '';
  const selectedImageType = readProductImageType(imageTypeValue);
  const attachedArbitraryUrl = arbitraryImage?.slot === field.key ? arbitraryImage.url : null;
  const previewUrl = attachedArbitraryUrl ?? savedImageUrl ?? selectedProduct?.featuredImage?.url ?? null;
  const hasSelection = !!selectedId || !!selectedImageType || !!attachedArbitraryUrl || !!savedImageUrl;

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-medium text-gray-700">{field.label}</label>
          <p className="mt-1 text-[11px] text-gray-500">
            {selectedProduct
              ? selectedProduct.name
              : attachedArbitraryUrl || savedImageUrl
                ? 'URL-only attachment'
                : selectedId || 'Not set'}
          </p>
          {!selectedId && savedImageUrl ? (
            <p className="mt-1 text-[11px] text-amber-600">Saved image URL will still be used.</p>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-400">
            Send: {PRODUCT_IMAGE_TYPE_OPTIONS.find((option) => option.value === selectedImageType)?.label ?? 'Featured Image'}
          </p>
        </div>
        {previewUrl ? (
          <div className="shrink-0 overflow-hidden rounded-md border border-gray-200 bg-white">
            <ImageWithSkeleton
              src={withImageParams(previewUrl)}
              alt={field.label}
              loading="lazy"
              wrapperClassName="h-14 w-14 bg-gray-50 p-1"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          {hasSelection && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                onImageTypeChange(null);
                if (arbitraryImage?.slot === field.key) onArbitraryImageChange(null);
              }}
              className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
          >
            {selectedId ? 'Change' : 'Choose'}
          </button>
        </div>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Image to send</p>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
            >
              Browse catalog
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_IMAGE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onImageTypeChange(option.value)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  (selectedImageType ?? 'featured-image') === option.value
                    ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-200'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {selectedImageType === 'arbitrary' && (
          <div className="mb-3 rounded-md border border-violet-200 bg-violet-50/40 p-3">
            <SceneImageInput
              label="Attached arbitrary image"
              value={attachedArbitraryUrl}
              onChange={(url) =>
                onArbitraryImageChange(url ? { url, slot: field.key } : null)
              }
            />
          </div>
        )}

        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50/60 px-3 py-2">
          <p className="text-[11px] font-medium text-gray-600">
            {selectedProduct ? selectedProduct.name : 'No product selected'}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            {selectedProduct
              ? `${selectedProduct.category?.name ?? 'No category'} • ${selectedId}`
              : savedImageUrl
                ? 'Saved URL-only image will still be used at runtime.'
                : 'Optional when using an arbitrary image URL.'}
          </p>
        </div>
      </div>

      {pickerOpen ? (
        <ProductSelectionModal
          field={field}
          products={products}
          loaded={loaded}
          selectedId={selectedId}
          onSelect={(productId) => {
            onChange(productId);
            setPickerOpen(false);
          }}
          onClear={() => {
            onChange(null);
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
  products,
  loaded,
  selectedId,
  onSelect,
  onClear,
  onClose,
}: {
  field: ProductFieldDef;
  products: CatalogProduct[];
  loaded: boolean;
  selectedId: string;
  onSelect: (productId: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
            <p className="mt-1 text-xs text-gray-500">Search by product name, category, family, or ID.</p>
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
        <div className="border-b border-gray-100 p-4">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={loaded ? `Search ${field.label.toLowerCase()}...` : 'Loading products...'}
            disabled={!loaded}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
        <div className="overflow-y-auto">
          {!loaded ? (
            <p className="px-4 py-6 text-sm text-gray-500">Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">No matching products.</p>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = product.id === selectedId;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelect(product.id)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 transition-colors ${
                    isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
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
                  </span>
                  {isSelected ? <span className="rounded bg-primary-100 px-2 py-0.5 text-[10px] font-semibold">Selected</span> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface DesignSettingsDisplayProps {
  value: Record<string, unknown>;
}

const SELECT_OPTION_LABELS = new Map<string, Map<string, string>>();
for (const field of SETTING_FIELDS) {
  if (field.type === 'select') {
    const optionMap = new Map<string, string>();
    for (const option of field.options) optionMap.set(option.value, option.label);
    SELECT_OPTION_LABELS.set(field.key, optionMap);
  }
}

export function DesignSettingsDisplay({ value }: DesignSettingsDisplayProps) {
  const { byId } = useCatalogProducts();
  const populated = FIELDS.filter((field) => isNonEmpty(value[field.key]));
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
    const imageTypeLabel =
      PRODUCT_IMAGE_TYPE_OPTIONS.find((option) => option.value === imageType)?.label ?? 'Featured Image';
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">{field.label}</span>
        <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">
          {`${product?.name ?? productId} · ${imageTypeLabel}`}
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
