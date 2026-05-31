import { type Diagnostic, linter } from "@codemirror/lint";
import { validateHandlebarsTemplate } from "@/lib/validate-handlebars";

/**
 * CodeMirror lint source that surfaces the existing handlebars validator inline.
 * Each `{ line, message }` is mapped to a diagnostic spanning that whole line so
 * the gutter marker and underline land on the offending line.
 */
export const handlebarsLinter = linter((view) => {
  const { doc } = view.state;
  const diagnostics: Diagnostic[] = [];
  for (const { line, message } of validateHandlebarsTemplate(doc.toString())) {
    const clamped = Math.min(Math.max(line, 1), doc.lines);
    const docLine = doc.line(clamped);
    diagnostics.push({ from: docLine.from, to: docLine.to, severity: "error", message });
  }
  return diagnostics;
});
