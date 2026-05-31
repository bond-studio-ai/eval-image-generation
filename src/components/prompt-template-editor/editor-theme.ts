import { EditorView } from "@codemirror/view";

/**
 * Shared CodeMirror theme matching the app's design tokens, applied to both the
 * Handlebars prompt editor and the design-settings JSON editor.
 */
export const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-surface-muted)",
    color: "var(--color-text-primary)",
    fontSize: "0.875rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--color-border-strong)"
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--color-primary-500)",
    boxShadow: "0 0 0 1px var(--color-primary-500)"
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.25rem"
  },
  ".cm-content": {
    caretColor: "var(--color-text-primary)",
    padding: "0.5rem 0"
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--color-text-disabled)",
    border: "none"
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "transparent"
  },
  ".cm-placeholder": {
    color: "var(--color-text-disabled)"
  }
});
