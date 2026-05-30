"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { localUrl } from "@/lib/api-base";
import { CONDITIONAL_OPTIONS, DOLLHOUSE_ATTRIBUTES, DOLLHOUSE_PRODUCT_TYPES, dollhouseReferencePath, REFERENCE_OPTIONS, toDollhousePathKey } from "@/lib/prompt-template-constants";
import { validateHandlebarsTemplate } from "@/lib/validate-handlebars";
import { ConditionalPopover } from "./prompt-template-editor/conditional-popover";
import { DollhousePopover } from "./prompt-template-editor/dollhouse-popover";
import { HighlightedTextarea } from "./prompt-template-editor/highlighted-textarea";
import { ReferencePopover } from "./prompt-template-editor/reference-popover";
import { attributesInitial, attributesReducer, conditionalInitial, conditionalReducer, dollhouseInitial, dollhouseReducer, referenceInitial, referenceReducer } from "./prompt-template-editor/state";
import { TemplateErrors } from "./prompt-template-editor/template-errors";

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
  const ok = exec.call(document, "insertText", false, text);
  if (ok) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
}

export function PromptTemplateEditor({
  value,
  onChange,
  placeholder = "Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}",
  rows = 8,
  className = "",
  showPicker = true,
  fillHeight = false
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
      .replace(/\bborder-gray-200\b/, "border-danger-300")
      .replace(/\bhover:border-border-strong\b/, "hover:border-danger-400")
      .replace(/\bfocus:border-primary-500\b/, "focus:border-danger-500")
      .replace(/\bfocus:ring-primary-500\b/, "focus:ring-danger-500");
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
    const inner = selected || "\n  \n";
    const wrapper = `${prefix}${inner}{{/if}}`;
    insertWithUndo(el, start, end, wrapper);
    dispatchConditional({ type: "close" });
    // When the user had no selection, put the caret on the blank line
    // inside the wrapper (matches the previous behaviour).
    if (!selected) {
      const caret = start + prefix.length + 1;
      requestAnimationFrame(() => el.setSelectionRange(caret, caret));
    }
  }, []);

  const fetchAttributes = useCallback(async (category: string) => {
    dispatchAttributes({ type: "fetchStart" });
    try {
      const segment = category.replace(/_/g, "-");
      const res = await fetch(localUrl(`catalog/products/${segment}/attributes`));
      const json: {
        data?: { attributes?: unknown };
        error?: { message?: string };
      } = await res.json();
      if (!res.ok) {
        dispatchAttributes({
          type: "fetchError",
          error: json.error?.message ?? `Could not load attributes (${res.status})`
        });
        return;
      }
      const raw = json.data?.attributes;
      const attrs = Array.isArray(raw) ? (raw as string[]) : [];
      dispatchAttributes({ type: "fetchSuccess", list: attrs });
    } catch {
      dispatchAttributes({ type: "fetchError", error: "Failed to load attributes" });
    } finally {
      dispatchAttributes({ type: "fetchEnd" });
    }
  }, []);

  const handleReferenceCategorySelect = useCallback(
    (cat: (typeof REFERENCE_OPTIONS)[number]) => {
      dispatchReference({ type: "setCategory", value: cat.value });
      fetchAttributes(cat.value);
    },
    [fetchAttributes]
  );

  const handleAttributeSelect = useCallback(
    (attr: string, singular: string) => {
      const ref = `{{products.${singular}.${attr}}}`;
      handleInsert(ref);
      dispatchReference({ type: "clearCategory" });
      dispatchReference({ type: "close" });
      dispatchAttributes({ type: "clearError" });
    },
    [handleInsert]
  );

  const handleDollhouseAttributeSelect = useCallback(
    (attr: (typeof DOLLHOUSE_ATTRIBUTES)[number]) => {
      if (!dollhouse.product) return;
      handleInsert(dollhouseReferencePath(dollhouse.product, attr));
      dispatchDollhouse({ type: "reset" });
    },
    [dollhouse.product, handleInsert]
  );

  const closeAll = useCallback(() => {
    dispatchConditional({ type: "reset" });
    dispatchReference({ type: "reset" });
    dispatchDollhouse({ type: "reset" });
    dispatchAttributes({ type: "clearError" });
  }, []);

  const filteredConditionalOptions = useMemo(() => {
    const q = conditional.search.trim().toLowerCase();
    if (!q) return CONDITIONAL_OPTIONS;
    return CONDITIONAL_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [conditional.search]);

  const filteredReferenceOptions = useMemo(() => {
    const q = reference.search.trim().toLowerCase();
    if (!q) return REFERENCE_OPTIONS;
    return REFERENCE_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
  }, [reference.search]);

  const filteredDollhouseProducts = useMemo(() => {
    const q = dollhouse.search.trim().toLowerCase();
    if (!q) return DOLLHOUSE_PRODUCT_TYPES;
    return DOLLHOUSE_PRODUCT_TYPES.filter((p) => p.toLowerCase().includes(q));
  }, [dollhouse.search]);

  const customDollhouseProduct = useMemo(() => toDollhousePathKey(dollhouse.search), [dollhouse.search]);

  useEffect(() => {
    if (!conditional.open && !reference.open && !dollhouse.open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [conditional.open, reference.open, dollhouse.open, closeAll]);

  if (!showPicker) {
    return (
      <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}>
        <HighlightedTextarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={fillHeight ? `min-h-0 flex-1 resize-none ${textareaClass}` : `resize-y ${textareaClass}`}
          fillHeight={fillHeight}
        />
        <TemplateErrors errors={errors} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 ${fillHeight ? "min-h-0 flex-1" : ""}`}>
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <ConditionalPopover
          state={conditional}
          dispatch={dispatchConditional}
          options={filteredConditionalOptions}
          onToggle={() => {
            dispatchConditional({ type: "toggle" });
            dispatchReference({ type: "close" });
            dispatchDollhouse({ type: "close" });
          }}
          onSelect={handleConditionalSelect}
        />

        <ReferencePopover
          state={reference}
          dispatch={dispatchReference}
          attrState={attrState}
          dispatchAttributes={dispatchAttributes}
          options={filteredReferenceOptions}
          onToggle={() => {
            const wasOpen = reference.open;
            dispatchReference({ type: "toggle" });
            dispatchConditional({ type: "close" });
            dispatchDollhouse({ type: "close" });
            if (!wasOpen) {
              dispatchAttributes({ type: "clearError" });
            }
          }}
          onCategorySelect={handleReferenceCategorySelect}
          onAttributeSelect={handleAttributeSelect}
        />

        <DollhousePopover
          state={dollhouse}
          dispatch={dispatchDollhouse}
          filteredProducts={filteredDollhouseProducts}
          customProduct={customDollhouseProduct}
          onToggle={() => {
            dispatchDollhouse({ type: "toggle" });
            dispatchConditional({ type: "close" });
            dispatchReference({ type: "close" });
          }}
          onAttributeSelect={handleDollhouseAttributeSelect}
        />
      </div>

      <HighlightedTextarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={fillHeight ? `min-h-0 flex-1 resize-none ${textareaClass}` : `resize-y ${textareaClass}`}
        fillHeight={fillHeight}
      />
      <TemplateErrors errors={errors} />
    </div>
  );
}
