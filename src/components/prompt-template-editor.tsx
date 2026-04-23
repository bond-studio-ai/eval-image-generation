'use client';

import { localUrl } from '@/lib/api-base';
import {
  CONDITIONAL_OPTIONS,
  DOLLHOUSE_ATTRIBUTES,
  DOLLHOUSE_PRODUCT_TYPES,
  dollhouseReferencePath,
  REFERENCE_OPTIONS,
  toDollhousePathKey,
  type DollhouseProductType,
} from '@/lib/prompt-template-constants';
import { validateHandlebarsTemplate } from '@/lib/validate-handlebars';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PromptTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** If true, show the picker toolbar. Default true. */
  showPicker?: boolean;
  /** If true, use flex-1 to fill available space. Default false. */
  fillHeight?: boolean;
}

function insertAtCursor(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  toInsert: string,
): { newValue: string; newCursor: number } {
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);
  const newValue = before + toInsert + after;
  const newCursor = selectionStart + toInsert.length;
  return { newValue, newCursor };
}

function insertWrapper(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  condition: string,
): { newValue: string; newCursor: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  const inner = selected || '\n  \n';
  const wrapper = `{{#if ${condition}}}${inner}{{/if}}`;
  const newValue = before + wrapper + after;
  const newCursor = selectionStart + `{{#if ${condition}}}`.length + (selected ? selected.length : 1);
  return { newValue, newCursor };
}

export function PromptTemplateEditor({
  value,
  onChange,
  placeholder = 'Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}',
  rows = 8,
  className = '',
  showPicker = true,
  fillHeight = false,
}: PromptTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [conditionalOpen, setConditionalOpen] = useState(false);
  const [conditionalSearch, setConditionalSearch] = useState('');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [referenceCategory, setReferenceCategory] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [attributesError, setAttributesError] = useState<string | null>(null);

  const [dollhouseOpen, setDollhouseOpen] = useState(false);
  const [dollhouseProduct, setDollhouseProduct] = useState<DollhouseProductType | null>(null);
  const [dollhouseSearch, setDollhouseSearch] = useState('');

  const errors = useMemo(() => validateHandlebarsTemplate(value), [value]);
  const hasErrors = errors.length > 0;

  const textareaClass = useMemo(() => {
    if (!hasErrors) return className;
    return className
      .replace(/\bborder-gray-200\b/, 'border-red-300')
      .replace(/\bhover:border-gray-300\b/, 'hover:border-red-400')
      .replace(/\bfocus:border-primary-500\b/, 'focus:border-red-500')
      .replace(/\bfocus:ring-primary-500\b/, 'focus:ring-red-500');
  }, [className, hasErrors]);

  const focusTextarea = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  const getSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return { start: 0, end: 0 };
    return { start: el.selectionStart, end: el.selectionEnd };
  }, []);

  const handleInsert = useCallback(
    (toInsert: string) => {
      const { start, end } = getSelection();
      const { newValue, newCursor } = insertAtCursor(value, start, end, toInsert);
      onChange(newValue);
      focusTextarea();
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(newCursor, newCursor);
      });
    },
    [value, onChange, getSelection, focusTextarea],
  );

  const handleConditionalSelect = useCallback(
    (opt: (typeof CONDITIONAL_OPTIONS)[number]) => {
      const condition = opt.isProduct ? `products.${opt.value}` : opt.value;
      const { start, end } = getSelection();
      const { newValue, newCursor } = insertWrapper(value, start, end, condition);
      onChange(newValue);
      setConditionalOpen(false);
      focusTextarea();
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(newCursor, newCursor);
      });
    },
    [value, onChange, getSelection, focusTextarea],
  );

  const fetchAttributes = useCallback(async (category: string) => {
    setAttributesLoading(true);
    setAttributes([]);
    setAttributesError(null);
    try {
      const segment = category.replace(/_/g, '-');
      const res = await fetch(localUrl(`catalog/products/${segment}/attributes`));
      const json: {
        data?: { attributes?: unknown };
        error?: { message?: string };
      } = await res.json();
      if (!res.ok) {
        setAttributesError(json.error?.message ?? `Could not load attributes (${res.status})`);
        return;
      }
      const raw = json.data?.attributes;
      const attrs = Array.isArray(raw) ? (raw as string[]) : [];
      setAttributes(attrs);
    } catch {
      setAttributesError('Failed to load attributes');
      setAttributes([]);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  const handleReferenceCategorySelect = useCallback(
    (cat: (typeof REFERENCE_OPTIONS)[number]) => {
      setReferenceCategory(cat.value);
      fetchAttributes(cat.value);
    },
    [fetchAttributes],
  );

  const handleAttributeSelect = useCallback(
    (attr: string, singular: string) => {
      const ref = `{{products.${singular}.${attr}}}`;
      handleInsert(ref);
      setReferenceCategory(null);
      setReferenceOpen(false);
      setAttributesError(null);
    },
    [handleInsert],
  );

  const handleDollhouseAttributeSelect = useCallback(
    (attr: (typeof DOLLHOUSE_ATTRIBUTES)[number]) => {
      if (!dollhouseProduct) return;
      handleInsert(dollhouseReferencePath(dollhouseProduct, attr));
      setDollhouseOpen(false);
      setDollhouseProduct(null);
      setDollhouseSearch('');
    },
    [dollhouseProduct, handleInsert],
  );

  const closeAll = useCallback(() => {
    setConditionalOpen(false);
    setReferenceOpen(false);
    setReferenceCategory(null);
    setAttributesError(null);
    setConditionalSearch('');
    setReferenceSearch('');
    setDollhouseOpen(false);
    setDollhouseProduct(null);
    setDollhouseSearch('');
  }, []);

  const filteredConditionalOptions = useMemo(() => {
    const q = conditionalSearch.trim().toLowerCase();
    if (!q) return CONDITIONAL_OPTIONS;
    return CONDITIONAL_OPTIONS.filter((opt) =>
      opt.label.toLowerCase().includes(q),
    );
  }, [conditionalSearch]);

  const filteredReferenceOptions = useMemo(() => {
    const q = referenceSearch.trim().toLowerCase();
    if (!q) return REFERENCE_OPTIONS;
    return REFERENCE_OPTIONS.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q),
    );
  }, [referenceSearch]);

  const filteredDollhouseProducts = useMemo(() => {
    const q = dollhouseSearch.trim().toLowerCase();
    if (!q) return DOLLHOUSE_PRODUCT_TYPES;
    return DOLLHOUSE_PRODUCT_TYPES.filter((p) => p.toLowerCase().includes(q));
  }, [dollhouseSearch]);

  const customDollhouseProduct = useMemo(
    () => toDollhousePathKey(dollhouseSearch),
    [dollhouseSearch],
  );

  useEffect(() => {
    if (!conditionalOpen && !referenceOpen && !dollhouseOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [conditionalOpen, referenceOpen, dollhouseOpen, closeAll]);

  if (!showPicker) {
    return (
      <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={fillHeight ? `min-h-0 flex-1 resize-none ${textareaClass}` : textareaClass}
        />
        <TemplateErrors errors={errors} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 ${fillHeight ? 'min-h-0 flex-1' : ''}`}
    >
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setConditionalOpen(!conditionalOpen);
              setReferenceOpen(false);
              setDollhouseOpen(false);
            }}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              conditionalOpen
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            Conditional
            <svg
              className={`h-3.5 w-3.5 text-gray-400 ${conditionalOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {conditionalOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-200 p-2">
                <input
                  type="text"
                  value={conditionalSearch}
                  onChange={(e) => setConditionalSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="max-h-48 overflow-auto py-1">
              {filteredConditionalOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleConditionalSelect(opt)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                >
                  {opt.label}
                </button>
              ))}
              {filteredConditionalOptions.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
              )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setReferenceOpen(!referenceOpen);
              setConditionalOpen(false);
              setDollhouseOpen(false);
              if (!referenceOpen) {
                setReferenceCategory(null);
                setAttributesError(null);
              }
            }}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              referenceOpen
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            Reference
            <svg
              className={`h-3.5 w-3.5 text-gray-400 ${referenceOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {referenceOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {!referenceCategory ? (
                <>
                  <div className="border-b border-gray-200 p-2">
                    <input
                      type="text"
                      value={referenceSearch}
                      onChange={(e) => setReferenceSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-auto py-1">
                    {filteredReferenceOptions.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleReferenceCategorySelect(cat)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                      >
                        {cat.label}
                      </button>
                    ))}
                    {filteredReferenceOptions.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceCategory(null);
                        setAttributes([]);
                        setAttributesError(null);
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      ← Back
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                      {REFERENCE_OPTIONS.find((o) => o.value === referenceCategory)?.label ??
                        referenceCategory}
                    </span>
                  </div>
                  <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                    Pick a field to insert{' '}
                    <code className="rounded bg-gray-100 px-0.5">
                      {`{{products.${REFERENCE_OPTIONS.find((o) => o.value === referenceCategory)?.singular ?? referenceCategory}.…}}`}
                    </code>
                  </p>
                  {attributesLoading ? (
                    <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
                  ) : attributesError ? (
                    <p className="px-3 py-4 text-sm text-red-600">{attributesError}</p>
                  ) : attributes.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500">No attributes</p>
                  ) : (
                    <div className="max-h-60 overflow-auto py-1">
                      {attributes.map((attr) => {
                        const opt = REFERENCE_OPTIONS.find((o) => o.value === referenceCategory);
                        const singular = opt?.singular ?? referenceCategory;
                        return (
                          <button
                            key={attr}
                            type="button"
                            onClick={() => handleAttributeSelect(attr, singular)}
                            className="w-full px-3 py-2 text-left font-mono text-xs text-gray-900 hover:bg-gray-50"
                          >
                            {attr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setDollhouseOpen(!dollhouseOpen);
              setConditionalOpen(false);
              setReferenceOpen(false);
              if (!dollhouseOpen) {
                setDollhouseProduct(null);
                setDollhouseSearch('');
              }
            }}
            title="Insert a dollhouse reference like {{dollhouse.vanity.quantity}} or {{#each dollhouse.vanity.visibility}}{{location}} ({{visible}}%){{/each}}"
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              dollhouseOpen
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            Dollhouse
            <svg
              className={`h-3.5 w-3.5 text-gray-400 ${dollhouseOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dollhouseOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {!dollhouseProduct ? (
                <>
                  <p className="border-b border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                    Pick a <strong>product</strong>. Inserts a{' '}
                    <code className="rounded bg-gray-100 px-0.5">{`{{#each dollhouse.{product}.visibility}}…{{/each}}`}</code>{' '}
                    block — the <code className="rounded bg-gray-100 px-0.5">dollhouse</code> namespace
                    is bound per image at render time.
                  </p>
                  <div className="border-b border-gray-200 p-2">
                    <input
                      type="text"
                      value={dollhouseSearch}
                      onChange={(e) => setDollhouseSearch(e.target.value)}
                      placeholder="Search or type a custom product key…"
                      className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                    {customDollhouseProduct &&
                      !DOLLHOUSE_PRODUCT_TYPES.some((product) => product === customDollhouseProduct) && (
                        <button
                          type="button"
                          onClick={() => setDollhouseProduct(customDollhouseProduct)}
                          className="mt-2 w-full rounded-md border border-dashed border-primary-300 bg-primary-50 px-3 py-2 text-left text-sm text-primary-800 hover:bg-primary-100"
                        >
                          Use custom product key <span className="font-mono">{customDollhouseProduct}</span>
                        </button>
                      )}
                  </div>
                  <div className="max-h-60 overflow-auto py-1">
                    {filteredDollhouseProducts.map((product) => (
                      <button
                        key={product}
                        type="button"
                        onClick={() => setDollhouseProduct(product)}
                        className="w-full px-3 py-2 text-left font-mono text-xs text-gray-900 hover:bg-gray-50"
                      >
                        {product}
                      </button>
                    ))}
                    {filteredDollhouseProducts.length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 border-b border-gray-100 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDollhouseProduct(null);
                        setDollhouseSearch('');
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      ← Back
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                      <span className="font-mono">{dollhouseProduct}</span>
                    </span>
                  </div>
                  <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                    Inserts a{' '}
                    <code className="rounded bg-gray-100 px-0.5">
                      {`{{#each dollhouse.${dollhouseProduct}.visibility}}…{{/each}}`}
                    </code>{' '}
                    block.
                  </p>
                  <div className="max-h-60 overflow-auto py-1">
                    {DOLLHOUSE_ATTRIBUTES.map((attr) => (
                      <button
                        key={attr.value}
                        type="button"
                        onClick={() => handleDollhouseAttributeSelect(attr)}
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <span className="font-mono text-xs text-gray-900">{attr.value}</span>
                        <span className="text-[11px] text-gray-500">{attr.helper}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`min-h-0 flex-1 resize-none ${textareaClass}`}
        />
      </div>
      <TemplateErrors errors={errors} />
    </div>
  );
}

const MAX_VISIBLE_ERRORS = 5;

function TemplateErrors({ errors }: { errors: { line: number; message: string }[] }) {
  if (errors.length === 0) return null;

  const visible = errors.slice(0, MAX_VISIBLE_ERRORS);
  const remaining = errors.length - visible.length;

  return (
    <div className="mt-1.5 shrink-0 rounded-md bg-red-50 px-3 py-2">
      <div className="space-y-0.5">
        {visible.map((err, i) => (
          <p key={i} className="flex items-start gap-1.5 text-xs text-red-700">
            <svg
              className="mt-0.5 h-3 w-3 shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <span className="font-semibold">Line {err.line}:</span> {err.message}
            </span>
          </p>
        ))}
      </div>
      {remaining > 0 && (
        <p className="mt-1 text-[10px] text-red-500">
          and {remaining} more {remaining === 1 ? 'error' : 'errors'}
        </p>
      )}
    </div>
  );
}
