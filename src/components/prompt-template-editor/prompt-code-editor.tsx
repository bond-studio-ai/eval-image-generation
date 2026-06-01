"use client";

import { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { type Ref } from "react";
import { handlebarsHighlighting, handlebarsLanguage } from "./handlebars-language";
import { handlebarsLinter } from "./handlebars-lint";
import { TemplateCodeEditor } from "./template-code-editor";

// Stable extension list so the editor is not reconfigured on every render.
const PROMPT_EXTENSIONS = [handlebarsLanguage, handlebarsHighlighting, handlebarsLinter];

export interface PromptCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minRows: number;
  fillHeight: boolean;
  editorRef: Ref<ReactCodeMirrorRef>;
}

/**
 * CodeMirror prompt editor bundle. Kept in its own module so callers can load
 * it (and the heavy CodeMirror dependencies) lazily via `next/dynamic`.
 */
export function PromptCodeEditor({ value, onChange, placeholder, minRows, fillHeight, editorRef }: PromptCodeEditorProps) {
  return <TemplateCodeEditor ref={editorRef} value={value} onChange={onChange} extensions={PROMPT_EXTENSIONS} placeholder={placeholder} minRows={minRows} fillHeight={fillHeight} />;
}
