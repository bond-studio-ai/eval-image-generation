"use client";

import { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { localUrl } from "@/lib/api-base";
import type { DOLLHOUSE_ATTRIBUTES } from "@/lib/prompt-template-constants";
import { CONDITIONAL_OPTIONS, DOLLHOUSE_PRODUCT_TYPES, dollhouseReferencePath, REFERENCE_OPTIONS, toDollhousePathKey } from "@/lib/prompt-template-constants";
import { ConditionalPopover } from "./prompt-template-editor/conditional-popover";
import { DollhousePopover } from "./prompt-template-editor/dollhouse-popover";
import { ReferencePopover } from "./prompt-template-editor/reference-popover";
import { attributesInitial, attributesReducer, conditionalInitial, conditionalReducer, dollhouseInitial, dollhouseReducer, referenceInitial, referenceReducer } from "./prompt-template-editor/state";

// Lazy-load the CodeMirror editor (and its heavy dependencies) so they stay out
// of the initial bundle; the editor is browser-only, so disable SSR.
const PromptCodeEditor = dynamic(
  async () => {
    const mod = await import("./prompt-template-editor/prompt-code-editor");
    return mod.PromptCodeEditor;
  },
  { ssr: false }
);

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

export function PromptTemplateEditor({ value, onChange, placeholder = "Handlebars template: {{products.vanity.name}}, {{#if products.vanity}}...{{/if}}", rows = 8, showPicker = true, fillHeight = false }: PromptTemplateEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [conditional, dispatchConditional] = useReducer(conditionalReducer, conditionalInitial);
  const [reference, dispatchReference] = useReducer(referenceReducer, referenceInitial);
  const [dollhouse, dispatchDollhouse] = useReducer(dollhouseReducer, dollhouseInitial);
  const [attrState, dispatchAttributes] = useReducer(attributesReducer, attributesInitial);

  const handleInsert = useCallback((toInsert: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch(view.state.update({ changes: { from, to, insert: toInsert }, selection: { anchor: from + toInsert.length } }));
    view.focus();
  }, []);

  const handleConditionalSelect = useCallback((opt: (typeof CONDITIONAL_OPTIONS)[number]) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const condition = opt.isProduct ? `products.${opt.value}` : opt.value;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const prefix = `{{#if ${condition}}}`;
    const inner = selected || "\n  \n";
    const wrapper = `${prefix}${inner}{{/if}}`;
    // With no selection, drop the caret on the blank line inside the wrapper;
    // otherwise place it just after the inserted block.
    const anchor = selected ? from + wrapper.length : from + prefix.length + 1;
    view.dispatch(view.state.update({ changes: { from, to, insert: wrapper }, selection: { anchor } }));
    view.focus();
    dispatchConditional({ type: "close" });
  }, []);

  const fetchAttributes = useCallback(async (category: string) => {
    dispatchAttributes({ type: "fetchStart" });
    try {
      const segment = category.replaceAll("_", "-");
      const res = await fetch(localUrl(`catalog/products/${segment}/attributes`));
      const json = (await res.json()) as {
        data?: { attributes?: unknown };
        error?: { message?: string };
      };
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
      void fetchAttributes(cat.value);
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
    const query = conditional.search.trim().toLowerCase();
    if (!query) return CONDITIONAL_OPTIONS;
    return CONDITIONAL_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [conditional.search]);

  const filteredReferenceOptions = useMemo(() => {
    const query = reference.search.trim().toLowerCase();
    if (!query) return REFERENCE_OPTIONS;
    return REFERENCE_OPTIONS.filter((opt) => opt.label.toLowerCase().includes(query) || opt.value.toLowerCase().includes(query));
  }, [reference.search]);

  const filteredDollhouseProducts = useMemo(() => {
    const query = dollhouse.search.trim().toLowerCase();
    if (!query) return DOLLHOUSE_PRODUCT_TYPES;
    return DOLLHOUSE_PRODUCT_TYPES.filter((product) => product.toLowerCase().includes(query));
  }, [dollhouse.search]);

  const customDollhouseProduct = useMemo(() => toDollhousePathKey(dollhouse.search), [dollhouse.search]);

  useEffect(() => {
    if (!conditional.open && !reference.open && !dollhouse.open) return undefined;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeAll();
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [conditional.open, reference.open, dollhouse.open, closeAll]);

  if (!showPicker) {
    return (
      <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}>
        <PromptCodeEditor editorRef={editorRef} value={value} onChange={onChange} placeholder={placeholder} minRows={rows} fillHeight={fillHeight} />
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

      <PromptCodeEditor editorRef={editorRef} value={value} onChange={onChange} placeholder={placeholder} minRows={rows} fillHeight={fillHeight} />
    </div>
  );
}
