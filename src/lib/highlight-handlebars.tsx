import type { ReactNode } from 'react';

/**
 * Render a handlebars template with inline syntax highlighting.
 *
 * Meant to be used as an overlay behind a `<textarea>` that has transparent
 * text, so users see the same characters they typed colored by role:
 *   - `{{! ... }}` / `{{!-- ... --}}` → dimmed comment
 *   - `{{#...}}` / `{{/...}}` / `{{^...}}` / `{{else}}` → block keyword
 *   - `{{> ...}}` → partial
 *   - `{{{ ... }}}` → unescaped expression
 *   - `{{ ... }}` → regular expression
 *
 * Non-mustache text is returned verbatim. Output is pre-split into spans so
 * the caller can render it inside a `white-space: pre-wrap` container and
 * have the character positions line up with the textarea exactly.
 */

type HandlebarsKind = 'comment' | 'block' | 'partial' | 'expr' | 'unescaped';

const CLASS_BY_KIND: Record<HandlebarsKind, string> = {
  comment: 'italic text-gray-400',
  block: 'font-medium text-purple-700',
  partial: 'text-emerald-700',
  expr: 'text-blue-700',
  unescaped: 'text-amber-700',
};

// Match (in priority order):
//   1. `{{!-- ... --}}`  — long-form comment
//   2. `{{! ... }}`      — short-form comment
//   3. `{{{ ... }}}`     — triple-brace unescaped expression
//   4. `{{ ... }}`       — regular mustache
// Regex is re-created per call so `lastIndex` is never shared across renders.
function mustacheRegex(): RegExp {
  return /\{\{!--[\s\S]*?--\}\}|\{\{![\s\S]*?\}\}|\{\{\{[\s\S]*?\}\}\}|\{\{[\s\S]*?\}\}/g;
}

function classify(match: string): HandlebarsKind {
  if (match.startsWith('{{!')) return 'comment';
  if (match.startsWith('{{{')) return 'unescaped';
  const inner = match.slice(2, -2).trimStart();
  const first = inner.charAt(0);
  if (first === '#' || first === '/' || first === '^') return 'block';
  if (first === '>') return 'partial';
  if (/^else\b/.test(inner)) return 'block';
  return 'expr';
}

export function renderHighlightedHandlebars(source: string): ReactNode[] {
  if (!source) return [];

  const nodes: ReactNode[] = [];
  const re = mustacheRegex();
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(source)) !== null) {
    const [token] = match;
    if (match.index > cursor) {
      nodes.push(
        <span key={`t-${cursor}`}>{source.slice(cursor, match.index)}</span>,
      );
    }
    nodes.push(
      <span key={`m-${match.index}`} className={CLASS_BY_KIND[classify(token)]}>
        {token}
      </span>,
    );
    cursor = match.index + token.length;

    // Zero-length matches would spin forever (shouldn't happen with the
    // patterns above, but belt and braces).
    if (match.index === re.lastIndex) re.lastIndex++;
  }

  if (cursor < source.length) {
    nodes.push(<span key={`t-${cursor}`}>{source.slice(cursor)}</span>);
  }

  // A trailing newline isn't rendered by the browser in a `pre-wrap` block,
  // which would make the overlay shorter than the textarea by one line and
  // hide any highlight on that line. A zero-width space preserves the row.
  if (source.endsWith('\n')) {
    nodes.push(<span key="trailing-nl">{'\u200B'}</span>);
  }

  return nodes;
}
