'use client';

import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import {
  extractReferencedVariables,
  findVariable,
  type PromptVariable,
} from '@/lib/prompt-template-format';
import { useCallback, useId, useMemo, useRef, useState } from 'react';

interface PromptTemplateEditorProps {
  value: string;
  onChange: (next: string) => void;
  variables: PromptVariable[];
  placeholder?: string;
  /** When true the textarea uses `min-h-0 flex-1` so it grows to fill
   *  the parent pane's height. Set this when the editor is mounted
   *  inside a fixed-height card (e.g. inside TwoPaneSplit) so the
   *  textarea doesn't overflow the card chrome. Default false. */
  fillHeight?: boolean;
  /** Number of textarea rows when `fillHeight` is false. */
  rows?: number;
  /** Optional aria-label override; defaults to "Prompt template". */
  ariaLabel?: string;
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
 * PromptTemplateEditor is the catalog-prompts counterpart to
 * `src/components/prompt-template-editor.tsx` (which is
 * Handlebars-focused and tied to the dollhouse/products attribute
 * APIs). The two editors share the same vertical "toolbar on top,
 * textarea below" layout so they slot identically into the
 * `TwoPaneSplit` cards used by the prompt-versions and
 * catalog-prompts pages — admins moving between the two surfaces
 * see the same affordances in the same places.
 *
 * The Handlebars editor handles its toolbar with three product/
 * conditional/dollhouse pickers; here we ship a single
 * "Insert variable" SearchableSelect populated from the
 * (kind, scope)-specific registry. Picking an option drops
 * `{{.FieldName}}` at the caret via `execCommand('insertText')` so
 * the textarea's native undo stack stays intact.
 */
export function PromptTemplateEditor({
  value,
  onChange,
  variables,
  placeholder,
  fillHeight = false,
  rows = 12,
  ariaLabel,
}: PromptTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reactId = useId();
  const inputId = `prompt-template-${reactId}`;
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

  // Mirrors the editableInput class used by the handlebars editor in
  // /prompt-versions/[id] so both editors look identical when mounted
  // inside the same TwoPaneSplit cards.
  const editableInput =
    'w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm transition-colors hover:border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1';

  return (
    <div className={fillHeight ? 'flex min-h-0 flex-1 flex-col gap-2' : 'flex flex-col gap-2'}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          {variables.length === 0 ? 'No variables for this kind/scope' : 'Insert variable'}
        </span>
        <div className="min-w-0 flex-1 max-w-xs">
          <SearchableSelect
            key={pickerResetKey}
            options={options}
            value=""
            onChange={insertVariable}
            ariaLabel={`Insert variable into ${ariaLabel ?? 'prompt template'}`}
            placeholder={
              variables.length === 0
                ? '— no variables —'
                : 'Search variables…'
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
        rows={fillHeight ? undefined : rows}
        spellCheck={false}
        aria-label={ariaLabel ?? 'Prompt template'}
        className={
          fillHeight
            ? `min-h-0 flex-1 resize-none font-mono ${editableInput}`
            : `resize-y font-mono ${editableInput}`
        }
        placeholder={placeholder}
      />

      {referencedVariables.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px]">
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
          {unknownReferences.length > 0 && (
            <span className="text-amber-700">
              {unknownReferences.length === 1
                ? '1 reference is not in the documented registry — double-check the field name before approving.'
                : `${unknownReferences.length} references are not in the documented registry — double-check the field names before approving.`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
