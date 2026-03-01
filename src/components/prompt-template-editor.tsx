'use client';

import {
  CONDITIONAL_OPTIONS,
  REFERENCE_OPTIONS,
} from '@/lib/prompt-template-constants';
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
  const [refDropdownOpen, setRefDropdownOpen] = useState(false);
  const [attrDropdownOpen, setAttrDropdownOpen] = useState(false);

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
    try {
      const segment = category.replace(/_/g, '-');
      const res = await fetch(`/api/v1/catalog/products/${segment}/attributes`);
      const json = await res.json();
      const attrs = json.data?.attributes ?? [];
      setAttributes(attrs);
    } catch {
      setAttributes([]);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  const handleReferenceCategorySelect = useCallback(
    (cat: (typeof REFERENCE_OPTIONS)[number]) => {
      setReferenceCategory(cat.value);
      setRefDropdownOpen(false);
      fetchAttributes(cat.value);
      setAttrDropdownOpen(true);
    },
    [fetchAttributes],
  );

  const handleAttributeSelect = useCallback(
    (attr: string, singular: string) => {
      const ref = `{{products.${singular}.${attr}}}`;
      handleInsert(ref);
      setAttrDropdownOpen(false);
      setReferenceCategory(null);
      setReferenceOpen(false);
    },
    [handleInsert],
  );

  const closeAll = useCallback(() => {
    setConditionalOpen(false);
    setReferenceOpen(false);
    setReferenceCategory(null);
    setAttrDropdownOpen(false);
    setConditionalSearch('');
    setReferenceSearch('');
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

  useEffect(() => {
    if (!conditionalOpen && !referenceOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [conditionalOpen, referenceOpen, closeAll]);

  if (!showPicker) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
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
              if (!referenceOpen) {
                setReferenceCategory(null);
                setAttrDropdownOpen(false);
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
            <div className="absolute left-0 top-full z-20 mt-1 flex gap-1">
                <div className="w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-200 p-2">
                    <input
                      type="text"
                      value={referenceSearch}
                      onChange={(e) => setReferenceSearch(e.target.value)}
                      placeholder="Search products…"
                      className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-auto py-1">
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
                </div>
                {referenceCategory && (
                  <div className="w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <p className="border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-500">
                      Pick attribute
                    </p>
                    {attributesLoading ? (
                      <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
                    ) : attributes.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-500">No attributes</p>
                    ) : (
                      <div className="max-h-48 overflow-auto">
                        {attributes.map((attr) => {
                          const opt = REFERENCE_OPTIONS.find((o) => o.value === referenceCategory);
                          const singular = opt?.singular ?? referenceCategory;
                          return (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => handleAttributeSelect(attr, singular)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                            >
                              {attr}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
          className={`min-h-0 flex-1 resize-none ${className}`}
        />
      </div>
    </div>
  );
}
