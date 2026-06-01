"use client";

import { type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror, { type BasicSetupOptions, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { type Ref, useMemo } from "react";
import { editorTheme } from "./editor-theme";

const BASIC_SETUP: BasicSetupOptions = {
  lineNumbers: true,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  autocompletion: false,
  searchKeymap: false,
  highlightSelectionMatches: false,
  closeBrackets: false,
  bracketMatching: false
};

// Approximate line height used to translate `minRows` into a min height when
// the editor is not in fill-height mode.
const ROW_HEIGHT_REM = 1.375;

export interface TemplateCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  extensions: Extension[];
  placeholder?: string;
  fillHeight?: boolean;
  minRows?: number;
  ariaLabel?: string;
  ref?: Ref<ReactCodeMirrorRef>;
}

export function TemplateCodeEditor({ value, onChange, extensions, placeholder, fillHeight = false, minRows = 8, ariaLabel, ref }: TemplateCodeEditorProps) {
  // Keep a stable extensions identity so `@uiw/react-codemirror` does not
  // dispatch a `reconfigure` effect (rebuilding the full extension set) on
  // every keystroke-driven re-render.
  const allExtensions = useMemo(() => (ariaLabel ? [editorTheme, EditorView.contentAttributes.of({ "aria-label": ariaLabel }), ...extensions] : [editorTheme, ...extensions]), [ariaLabel, extensions]);
  const optionalProps = {
    ...(fillHeight ? { height: "100%", minHeight: "0" } : { minHeight: `${minRows * ROW_HEIGHT_REM}rem` }),
    ...(placeholder === undefined ? {} : { placeholder })
  };

  return <CodeMirror ref={ref} value={value} onChange={onChange} extensions={allExtensions} basicSetup={BASIC_SETUP} className={fillHeight ? "min-h-0 flex-1 overflow-hidden" : ""} {...optionalProps} />;
}
