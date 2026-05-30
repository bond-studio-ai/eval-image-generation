'use client';

import { localUrl } from '@/lib/api-base';
import { renderHighlightedHandlebarsByLine } from '@/lib/highlight-handlebars';
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
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
  type TextareaHTMLAttributes,
  type UIEvent,
} from 'react';

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

/**
 * Replace the selection `[start, end)` with `text` in a way that
 * participates in the browser's native undo stack.
 *
 * `document.execCommand('insertText')` is deprecated but still universally
 * implemented in the browsers we target and is the only path that
 * actually records the change on the textarea's undo history. When it
 * refuses (returns false) we fall back to the prototype-setter trick and
 * a synthetic `input` event, which keeps React's controlled value in sync
 * but will not be undoable in that rare case.
 */
function insertWithUndo(el: HTMLTextAreaElement, start: number, end: number, text: string): void {
  el.focus();
  el.setSelectionRange(start, end);
  // `document.execCommand` is marked deprecated in lib.dom but is still
  // the only cross-browser way to edit a textarea's value while keeping
  // the native undo stack intact. Route the call through a local,
  // non-deprecated signature to avoid the editor warning at the call
  // site without suppressing unrelated deprecations.
  const exec = (
    document as unknown as {
      execCommand(command: string, showUi?: boolean, value?: string): boolean;
    }
  ).execCommand;
  const ok = exec.call(document, 'insertText', false, text);
  if (ok) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
}

// --- Conditional popover state ---
interface ConditionalState {
  open: boolean;
  search: string;
}
const conditionalInitial: ConditionalState = { open: false, search: '' };
type ConditionalAction =
  | { type: 'toggle' }
  | { type: 'close' }
  | { type: 'reset' }
  | { type: 'setSearch'; value: string };
function conditionalReducer(state: ConditionalState, action: ConditionalAction): ConditionalState {
  switch (action.type) {
    case 'toggle':
      return { ...state, open: !state.open };
    case 'close':
      return { ...state, open: false };
    case 'reset':
      return conditionalInitial;
    case 'setSearch':
      return { ...state, search: action.value };
  }
}

// --- Reference popover state ---
interface ReferenceState {
  open: boolean;
  search: string;
  category: string | null;
}
const referenceInitial: ReferenceState = { open: false, search: '', category: null };
type ReferenceAction =
  | { type: 'toggle' }
  | { type: 'close' }
  | { type: 'reset' }
  | { type: 'setSearch'; value: string }
  | { type: 'setCategory'; value: string }
  | { type: 'clearCategory' };
function referenceReducer(state: ReferenceState, action: ReferenceAction): ReferenceState {
  switch (action.type) {
    case 'toggle':
      // Opening the picker resets the drill-down category; closing preserves it.
      return state.open ? { ...state, open: false } : { ...state, open: true, category: null };
    case 'close':
      return { ...state, open: false };
    case 'reset':
      return referenceInitial;
    case 'setSearch':
      return { ...state, search: action.value };
    case 'setCategory':
      return { ...state, category: action.value };
    case 'clearCategory':
      return { ...state, category: null };
  }
}

// --- Dollhouse popover state ---
interface DollhouseState {
  open: boolean;
  product: DollhouseProductType | null;
  search: string;
}
const dollhouseInitial: DollhouseState = { open: false, product: null, search: '' };
type DollhouseAction =
  | { type: 'toggle' }
  | { type: 'close' }
  | { type: 'reset' }
  | { type: 'setSearch'; value: string }
  | { type: 'setProduct'; value: DollhouseProductType }
  | { type: 'clearProduct' };
function dollhouseReducer(state: DollhouseState, action: DollhouseAction): DollhouseState {
  switch (action.type) {
    case 'toggle':
      // Opening the picker clears any selected product and search query.
      return state.open
        ? { ...state, open: false }
        : { ...state, open: true, product: null, search: '' };
    case 'close':
      return { ...state, open: false };
    case 'reset':
      return dollhouseInitial;
    case 'setSearch':
      return { ...state, search: action.value };
    case 'setProduct':
      return { ...state, product: action.value };
    case 'clearProduct':
      return { ...state, product: null, search: '' };
  }
}

// --- Reference attributes fetch state ---
interface AttributesState {
  list: string[];
  loading: boolean;
  error: string | null;
}
const attributesInitial: AttributesState = { list: [], loading: false, error: null };
type AttributesAction =
  | { type: 'fetchStart' }
  | { type: 'fetchSuccess'; list: string[] }
  | { type: 'fetchError'; error: string }
  | { type: 'fetchEnd' }
  | { type: 'clearError' }
  | { type: 'clear' };
function attributesReducer(state: AttributesState, action: AttributesAction): AttributesState {
  switch (action.type) {
    case 'fetchStart':
      return { list: [], loading: true, error: null };
    case 'fetchSuccess':
      return { ...state, list: action.list };
    case 'fetchError':
      return { ...state, list: [], error: action.error };
    case 'fetchEnd':
      return { ...state, loading: false };
    case 'clearError':
      return { ...state, error: null };
    case 'clear':
      return { ...state, list: [], error: null };
  }
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
  const [conditional, dispatchConditional] = useReducer(conditionalReducer, conditionalInitial);
  const [reference, dispatchReference] = useReducer(referenceReducer, referenceInitial);
  const [dollhouse, dispatchDollhouse] = useReducer(dollhouseReducer, dollhouseInitial);
  const [attrState, dispatchAttributes] = useReducer(attributesReducer, attributesInitial);

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

  const handleInsert = useCallback((toInsert: string) => {
    const el = textareaRef.current;
    if (!el) return;
    insertWithUndo(el, el.selectionStart, el.selectionEnd, toInsert);
  }, []);

  const handleConditionalSelect = useCallback((opt: (typeof CONDITIONAL_OPTIONS)[number]) => {
    const el = textareaRef.current;
    if (!el) return;
    const condition = opt.isProduct ? `products.${opt.value}` : opt.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const prefix = `{{#if ${condition}}}`;
    const inner = selected || '\n  \n';
    const wrapper = `${prefix}${inner}{{/if}}`;
    insertWithUndo(el, start, end, wrapper);
    dispatchConditional({ type: 'close' });
    // When the user had no selection, put the caret on the blank line
    // inside the wrapper (matches the previous behaviour).
    if (!selected) {
      const caret = start + prefix.length + 1;
      requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    }
  }, []);

  const fetchAttributes = useCallback(async (category: string) => {
    dispatchAttributes({ type: 'fetchStart' });
    try {
      const segment = category.replace(/_/g, '-');
      const res = await fetch(localUrl(`catalog/products/${segment}/attributes`));
      const json: {
        data?: { attributes?: unknown };
        error?: { message?: string };
      } = await res.json();
      if (!res.ok) {
        dispatchAttributes({
          type: 'fetchError',
          error: json.error?.message ?? `Could not load attributes (${res.status})`,
        });
        return;
      }
      const raw = json.data?.attributes;
      const attrs = Array.isArray(raw) ? (raw as string[]) : [];
      dispatchAttributes({ type: 'fetchSuccess', list: attrs });
    } catch {
      dispatchAttributes({ type: 'fetchError', error: 'Failed to load attributes' });
    } finally {
      dispatchAttributes({ type: 'fetchEnd' });
    }
  }, []);

  const handleReferenceCategorySelect = useCallback(
    (cat: (typeof REFERENCE_OPTIONS)[number]) => {
      dispatchReference({ type: 'setCategory', value: cat.value });
      fetchAttributes(cat.value);
    },
    [fetchAttributes],
  );

  const handleAttributeSelect = useCallback(
    (attr: string, singular: string) => {
      const ref = `{{products.${singular}.${attr}}}`;
      handleInsert(ref);
      dispatchReference({ type: 'clearCategory' });
      dispatchReference({ type: 'close' });
      dispatchAttributes({ type: 'clearError' });
    },
    [handleInsert],
  );

  const handleDollhouseAttributeSelect = useCallback(
    (attr: (typeof DOLLHOUSE_ATTRIBUTES)[number]) => {
      if (!dollhouse.product) return;
      handleInsert(dollhouseReferencePath(dollhouse.product, attr));
      dispatchDollhouse({ type: 'reset' });
    },
    [dollhouse.product, handleInsert],
  );

  const closeAll = useCallback(() => {
    dispatchConditional({ type: 'reset' });
    dispatchReference({ type: 'reset' });
    dispatchDollhouse({ type: 'reset' });
    dispatchAttributes({ type: 'clearError' });
  }, []);

  const filteredConditionalOptions = useMemo(() => {
    const q = conditional.search.trim().toLowerCase();
    if (!q) return CONDITIONAL_OPTIONS;
    return CONDITIONAL_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [conditional.search]);

  const filteredReferenceOptions = useMemo(() => {
    const q = reference.search.trim().toLowerCase();
    if (!q) return REFERENCE_OPTIONS;
    return REFERENCE_OPTIONS.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    );
  }, [reference.search]);

  const filteredDollhouseProducts = useMemo(() => {
    const q = dollhouse.search.trim().toLowerCase();
    if (!q) return DOLLHOUSE_PRODUCT_TYPES;
    return DOLLHOUSE_PRODUCT_TYPES.filter((p) => p.toLowerCase().includes(q));
  }, [dollhouse.search]);

  const customDollhouseProduct = useMemo(
    () => toDollhousePathKey(dollhouse.search),
    [dollhouse.search],
  );

  useEffect(() => {
    if (!conditional.open && !reference.open && !dollhouse.open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [conditional.open, reference.open, dollhouse.open, closeAll]);

  if (!showPicker) {
    return (
      <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''}>
        <HighlightedTextarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={
            fillHeight ? `min-h-0 flex-1 resize-none ${textareaClass}` : `resize-y ${textareaClass}`
          }
          fillHeight={fillHeight}
        />
        <TemplateErrors errors={errors} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 ${fillHeight ? 'min-h-0 flex-1' : ''}`}>
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              dispatchConditional({ type: 'toggle' });
              dispatchReference({ type: 'close' });
              dispatchDollhouse({ type: 'close' });
            }}
            className={`inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              conditional.open
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            <span className="truncate">Conditional</span>
            <svg
              className={`h-3.5 w-3.5 flex-none text-gray-400 ${conditional.open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {conditional.open && (
            <div className="absolute top-full left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-200 p-2">
                <input
                  type="text"
                  aria-label="Search conditionals"
                  value={conditional.search}
                  onChange={(e) =>
                    dispatchConditional({ type: 'setSearch', value: e.target.value })
                  }
                  placeholder="Search…"
                  className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:ring-1"
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
              const wasOpen = reference.open;
              dispatchReference({ type: 'toggle' });
              dispatchConditional({ type: 'close' });
              dispatchDollhouse({ type: 'close' });
              if (!wasOpen) {
                dispatchAttributes({ type: 'clearError' });
              }
            }}
            className={`inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              reference.open
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            <span className="truncate">Reference</span>
            <svg
              className={`h-3.5 w-3.5 flex-none text-gray-400 ${reference.open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {reference.open && (
            <div className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {!reference.category ? (
                <>
                  <div className="border-b border-gray-200 p-2">
                    <input
                      type="text"
                      aria-label="Search products"
                      value={reference.search}
                      onChange={(e) =>
                        dispatchReference({ type: 'setSearch', value: e.target.value })
                      }
                      placeholder="Search products…"
                      className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:ring-1"
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
                        dispatchReference({ type: 'clearCategory' });
                        dispatchAttributes({ type: 'clear' });
                      }}
                      className="text-primary-700 hover:bg-primary-50 rounded px-2 py-1 text-xs font-medium"
                    >
                      ← Back
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                      {REFERENCE_OPTIONS.find((o) => o.value === reference.category)?.label ??
                        reference.category}
                    </span>
                  </div>
                  <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                    Pick a field to insert{' '}
                    <code className="rounded bg-gray-100 px-0.5">
                      {`{{products.${REFERENCE_OPTIONS.find((o) => o.value === reference.category)?.singular ?? reference.category}.…}}`}
                    </code>
                  </p>
                  {attrState.loading ? (
                    <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
                  ) : attrState.error ? (
                    <p className="px-3 py-4 text-sm text-red-600">{attrState.error}</p>
                  ) : attrState.list.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500">No attributes</p>
                  ) : (
                    <div className="max-h-60 overflow-auto py-1">
                      {attrState.list.map((attr) => {
                        const opt = REFERENCE_OPTIONS.find((o) => o.value === reference.category);
                        const singular = opt?.singular ?? reference.category ?? '';
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
              dispatchDollhouse({ type: 'toggle' });
              dispatchConditional({ type: 'close' });
              dispatchReference({ type: 'close' });
            }}
            title="Insert a dollhouse reference like {{dollhouse.vanity.quantity}} or {{#each dollhouse.vanity.visibility}}{{location}} ({{visible}}%){{/each}}"
            className={`inline-flex w-full items-center justify-center gap-1 rounded border px-2 py-1 text-xs font-medium shadow-sm transition-colors ${
              dollhouse.open
                ? 'border-primary-300 bg-primary-50/90 text-primary-800'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }`}
          >
            <span className="truncate">Dollhouse</span>
            <svg
              className={`h-3.5 w-3.5 flex-none text-gray-400 ${dollhouse.open ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {dollhouse.open && (
            <div className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              {!dollhouse.product ? (
                <>
                  <p className="border-b border-gray-100 px-3 py-2 text-[11px] text-gray-500">
                    Pick a <strong>product</strong>. Inserts a{' '}
                    <code className="rounded bg-gray-100 px-0.5">{`{{#each dollhouse.{product}.visibility}}…{{/each}}`}</code>{' '}
                    block; the <code className="rounded bg-gray-100 px-0.5">dollhouse</code>{' '}
                    namespace is bound per image at render time.
                  </p>
                  <div className="border-b border-gray-200 p-2">
                    <input
                      type="text"
                      aria-label="Search dollhouse products"
                      value={dollhouse.search}
                      onChange={(e) =>
                        dispatchDollhouse({ type: 'setSearch', value: e.target.value })
                      }
                      placeholder="Search or type a custom product key…"
                      className="focus:border-primary-500 focus:ring-primary-500 w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:ring-1"
                    />
                    {customDollhouseProduct &&
                      !DOLLHOUSE_PRODUCT_TYPES.some(
                        (product) => product === customDollhouseProduct,
                      ) && (
                        <button
                          type="button"
                          onClick={() =>
                            dispatchDollhouse({ type: 'setProduct', value: customDollhouseProduct })
                          }
                          className="border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100 mt-2 w-full rounded-md border border-dashed px-3 py-2 text-left text-sm"
                        >
                          Use custom product key{' '}
                          <span className="font-mono">{customDollhouseProduct}</span>
                        </button>
                      )}
                  </div>
                  <div className="max-h-60 overflow-auto py-1">
                    {filteredDollhouseProducts.map((product) => (
                      <button
                        key={product}
                        type="button"
                        onClick={() => dispatchDollhouse({ type: 'setProduct', value: product })}
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
                      onClick={() => dispatchDollhouse({ type: 'clearProduct' })}
                      className="text-primary-700 hover:bg-primary-50 rounded px-2 py-1 text-xs font-medium"
                    >
                      ← Back
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-600">
                      <span className="font-mono">{dollhouse.product}</span>
                    </span>
                  </div>
                  <p className="border-b border-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                    Inserts a{' '}
                    <code className="rounded bg-gray-100 px-0.5">
                      {`{{#each dollhouse.${dollhouse.product}.visibility}}…{{/each}}`}
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

      <HighlightedTextarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={
          fillHeight ? `min-h-0 flex-1 resize-none ${textareaClass}` : `resize-y ${textareaClass}`
        }
        fillHeight={fillHeight}
      />
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
        {visible.map((err) => (
          <p
            key={`${err.line}:${err.message}`}
            className="flex items-start gap-1.5 text-xs text-red-700"
          >
            <svg
              className="mt-0.5 size-3 shrink-0 text-red-500"
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

type HighlightedTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
> & {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  fillHeight?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

// Width of the line-number gutter, declared once so the overlay and the
// textarea's left padding stay in lockstep.
const GUTTER_WIDTH = '2.5rem';

/**
 * Measure the native vertical scrollbar width once and cache it.
 * Returns 0 in non-DOM environments and on platforms with overlay
 * scrollbars (e.g. macOS Safari with trackpad-only scrollbars).
 */
let cachedScrollbarWidth: number | null = null;
function measureScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;
  if (typeof document === 'undefined') return 0;
  const outer = document.createElement('div');
  outer.style.cssText =
    'position:absolute;top:-9999px;left:-9999px;visibility:hidden;overflow:scroll;width:100px;height:100px;';
  document.body.appendChild(outer);
  const inner = document.createElement('div');
  inner.style.cssText = 'width:100%;height:200px;';
  outer.appendChild(inner);
  const sw = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);
  cachedScrollbarWidth = sw;
  return sw;
}

/**
 * Transparent-text `<textarea>` with a syntax-highlighted overlay and a
 * line-number gutter, both aligned character-for-character with the
 * textarea behind them.
 *
 * Layout:
 *  - A single overlay behind the textarea hosts a 2-column CSS grid:
 *      col 1 = fixed-width gutter cell (line number, top-aligned)
 *      col 2 = flexible content cell (highlighted text, `pre-wrap`)
 *    Each logical line is its own grid row, so when a line wraps into
 *    multiple visual rows the grid row auto-expands and the gutter
 *    number stays pinned at the visual top of its logical line.
 *  - The textarea is stacked above the overlay (`z-10`). Its
 *    `paddingLeft` is forced to `GUTTER_WIDTH` so characters line up
 *    with the overlay's content column, making wrap points match.
 *  - The textarea reserves its native scrollbar width via
 *    `scrollbar-gutter: stable`. To keep the overlay's usable width
 *    identical, the overlay is NOT a scroll container — it is
 *    `overflow: hidden`, its right padding is the measured scrollbar
 *    width, and scrolling is sync'd by translating the inner grid via
 *    `transform` from the textarea's `onScroll`. This sidesteps every
 *    browser's quirky `scrollbar-gutter` handling for nested hidden
 *    scrollbars, which was the root cause of the line-wrap drift.
 *  - Color and background on the textarea are set via inline `style` so
 *    they always win over whatever the caller passes in `className`.
 */
function HighlightedTextarea({
  value,
  onChange,
  className,
  fillHeight = false,
  onScroll,
  style,
  ref,
  ...rest
}: HighlightedTextareaProps) {
  const overlayInnerRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useEffect(() => {
    setScrollbarWidth(measureScrollbarWidth());
  }, []);

  const handleScroll = useCallback(
    (e: UIEvent<HTMLTextAreaElement>) => {
      const inner = overlayInnerRef.current;
      if (inner) {
        const t = e.currentTarget;
        inner.style.transform = `translate(${-t.scrollLeft}px, ${-t.scrollTop}px)`;
      }
      onScroll?.(e);
    },
    [onScroll],
  );

  const lines = useMemo(() => renderHighlightedHandlebarsByLine(value), [value]);

  return (
    <div className={`relative ${fillHeight ? 'flex min-h-0 flex-1' : ''}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
        style={{
          borderColor: 'transparent',
          boxShadow: 'none',
          paddingLeft: 0,
          paddingRight: scrollbarWidth,
        }}
      >
        <div
          ref={overlayInnerRef}
          className="grid"
          style={{
            gridTemplateColumns: `${GUTTER_WIDTH} 1fr`,
          }}
        >
          {lines.map((line, i) => (
            <Fragment key={i}>
              <div className="self-start pr-2 text-right font-mono text-sm leading-5 text-gray-400 tabular-nums select-none">
                {i + 1}
              </div>
              <div className="pr-3 font-mono text-sm leading-5 break-words whitespace-pre-wrap text-gray-900">
                {line}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <textarea
        {...rest}
        ref={ref}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        spellCheck={false}
        className={`relative z-10 w-full ${className ?? ''}`}
        style={{
          ...style,
          color: 'transparent',
          backgroundColor: 'transparent',
          caretColor: 'rgb(17, 24, 39)',
          paddingLeft: GUTTER_WIDTH,
          scrollbarGutter: 'stable',
          lineHeight: '1.25rem',
        }}
      />
    </div>
  );
}
