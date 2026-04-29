'use client';

import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import {
  extractReferencedVariables,
  findVariable,
  type PromptVariable,
} from '@/lib/prompt-template-format';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { PromptTemplateDisplay } from './prompt-template-display';

interface PromptTemplateEditorProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  variables: PromptVariable[];
  placeholder?: string;
  rows?: number;
  required?: boolean;
  /** Optional hint shown under the label. */
  hint?: string;
}

/**
 * Replace the textarea selection `[start, end)` with `text` while
 * keeping the browser's native undo stack alive. `execCommand` is
 * deprecated but still the only path that records the change on the
 * textarea's own undo history. The prototype-setter fallback covers
 * the small set of browsers where `execCommand` returns false.
 *
 * Mirrors `insertWithUndo` in src/components/prompt-template-editor.tsx
 * — kept duplicated rather than extracted because that editor is
 * Handlebars-focused and we want this editor to stay
 * dependency-light.
 */
function insertAtSelection(el: HTMLTextAreaElement, text: string) {
  el.focus();
  const exec = (
    document as unknown as {
      execCommand(command: string, showUi?: boolean, value?: string): boolean;
    }
  ).execCommand;
  if (exec.call(document, 'insertText', false, text)) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  setter?.call(el, el.value.slice(0, start) + text + el.value.slice(end));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  const caret = start + text.length;
  el.setSelectionRange(caret, caret);
}

/**
 * PromptTemplateEditor pairs a plain textarea with two affordances
 * tailored for catalog-prompts: an Insert-variable searchable
 * dropdown that drops `{{.FieldName}}` at the caret, and a live
 * preview pane that mirrors the read-only PromptTemplateDisplay.
 *
 * Why a separate file from the existing `prompt-template-editor.tsx`?
 * That component is purpose-built for Handlebars (`{{#if}}`,
 * `{{products.foo}}`) and pulls in dynamic catalogue attributes from
 * the REST API. Catalog prompts use Go `text/template` and resolve
 * against frozen typed structs (GenerationData / JudgeData /
 * ProceduralContext / aidomain.Context), so the variable list is a
 * static registry and the highlighter only needs Go-template token
 * shapes. Sharing would import a lot of irrelevant Handlebars
 * machinery; duplicating the small textarea + insertWithUndo helper
 * keeps both editors focused on their respective template languages.
 */
export function PromptTemplateEditor({
  label,
  value,
  onChange,
  variables,
  placeholder,
  rows = 12,
  required = false,
  hint,
}: PromptTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reactId = useId();
  const inputId = `prompt-template-${reactId}`;
  const [showPreview, setShowPreview] = useState(true);
  // Reset key forces SearchableSelect to clear its own input after
  // each insert so the dropdown reads "Insert variable…" again
  // instead of holding the previously-inserted name.
  const [pickerResetKey, setPickerResetKey] = useState(0);

  const insertVariable = useCallback(
    (rawValue: string) => {
      if (!rawValue) return;
      const meta = findVariable(variables, rawValue);
      if (!meta) return;
      const el = textareaRef.current;
      if (el) {
        insertAtSelection(el, `{{.${meta.name}}}`);
      } else {
        // Fallback for browsers that don't grant focus mid-keypress —
        // append at end so the action is still observable.
        onChange(`${value}{{.${meta.name}}}`);
      }
      setPickerResetKey((k) => k + 1);
    },
    [onChange, value, variables],
  );

  const options = useMemo<SearchableSelectOption[]>(() => {
    return variables.map((v) => ({
      value: v.name,
      label: `{{.${v.name}}}`,
      description: `${v.type} — ${v.description}`,
      group: v.group,
    }));
  }, [variables]);

  const referencedVariables = useMemo(() => extractReferencedVariables(value), [value]);
  const unknownReferences = useMemo(() => {
    const known = new Set(variables.map((v) => v.name));
    return referencedVariables.filter((name) => !known.has(name));
  }, [referencedVariables, variables]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 shadow-xs hover:bg-gray-50"
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
      </div>
      {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}

      <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
              Source
            </span>
            <div className="min-w-0 flex-1 max-w-xs">
              <SearchableSelect
                key={pickerResetKey}
                options={options}
                value=""
                onChange={insertVariable}
                ariaLabel={`Insert variable into ${label}`}
                placeholder={
                  variables.length === 0
                    ? 'No variables available for this kind/scope'
                    : 'Insert variable…'
                }
                disabled={variables.length === 0}
                emptyMessage="No matching variables."
              />
            </div>
          </div>
          <textarea
            id={inputId}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            spellCheck={false}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 shadow-xs focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            placeholder={placeholder}
          />
          {referencedVariables.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-gray-500">Variables in use:</span>
              {referencedVariables.map((name) => {
                const meta = findVariable(variables, name);
                return (
                  <span
                    key={name}
                    title={
                      meta
                        ? `${meta.type} — ${meta.description}`
                        : `Not in the documented registry for this prompt kind/scope.`
                    }
                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono ${
                      meta
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}
                  >
                    {`{{.${name}}}`}
                  </span>
                );
              })}
            </div>
          )}
          {unknownReferences.length > 0 && (
            <p className="mt-1 text-[11px] text-amber-700">
              {unknownReferences.length === 1
                ? '1 reference is not in the documented registry — double-check the field name before approving.'
                : `${unknownReferences.length} references are not in the documented registry — double-check the field names before approving.`}
            </p>
          )}
        </div>
        {showPreview && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                Preview
              </span>
              <span className="text-[11px] text-gray-400">
                Hover a chip to see the typed value the worker injects.
              </span>
            </div>
            <div className="mt-2">
              <PromptTemplateDisplay template={value} variables={variables} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
