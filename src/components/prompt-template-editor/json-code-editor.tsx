"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { TemplateCodeEditor } from "./template-code-editor";

// Stable extension list so the editor is not reconfigured on every render.
const JSON_EXTENSIONS = [json(), linter(jsonParseLinter())];

export interface JsonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  minRows: number;
}

/**
 * CodeMirror JSON editor bundle. Kept in its own module so callers can load it
 * (and the heavy CodeMirror dependencies) lazily via `next/dynamic`.
 */
export function JsonCodeEditor({ value, onChange, placeholder, ariaLabel, minRows }: JsonCodeEditorProps) {
  return <TemplateCodeEditor value={value} onChange={onChange} extensions={JSON_EXTENSIONS} placeholder={placeholder} ariaLabel={ariaLabel} minRows={minRows} />;
}
