export type TemplateError = {
  line: number;
  message: string;
};

/**
 * Handlebars template validator.
 *
 * Reports:
 *   - Unclosed `{{` / unterminated tokens.
 *   - Empty expressions (`{{}}`, `{{ }}`).
 *   - Mismatched or orphan block close tags.
 *   - Unclosed block opens (`{{#…}}` without a matching `{{/…}}`).
 *   - `{{else}}` / `{{else if …}}` outside of any block.
 *
 * Supports the full surface area used in practice:
 *   - Block helpers: `{{#name …}}…{{/name}}`
 *   - Inverse blocks: `{{^name …}}…{{/name}}`
 *   - Else branches: `{{else}}`, `{{else if …}}`
 *   - Whitespace control: `{{~#name …~}}`, `{{~/name~}}` etc.
 *   - Comments: `{{! … }}`, `{{!-- … --}}` (may span `}}`)
 *   - Partials: `{{> name}}`, `{{#> name}}…{{/name}}`, `{{#*inline "…"}}…{{/inline}}`
 *   - Raw blocks: `{{{{raw-helper}}}}…{{{{/raw-helper}}}}`
 *   - Triple-stash unescaped: `{{{ expr }}}`
 *   - Subexpressions and string literals inside expressions
 *     (strings can contain `}}` without prematurely terminating the token).
 */
export function validateHandlebarsTemplate(
  template: string,
): TemplateError[] {
  const errors: TemplateError[] = [];
  if (!template.trim()) return errors;

  const lineStarts: number[] = [0];
  for (let i = 0; i < template.length; i++) {
    if (template[i] === '\n') lineStarts.push(i + 1);
  }

  function getLine(pos: number): number {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  }

  type Token =
    | { kind: 'comment'; line: number }
    | { kind: 'partial'; line: number }
    | {
        kind: 'blockOpen';
        name: string;
        line: number;
        indent: number;
        display: string;
      }
    | { kind: 'blockClose'; name: string; line: number; indent: number }
    | { kind: 'rawOpen'; name: string; line: number }
    | { kind: 'rawClose'; name: string; line: number }
    | { kind: 'else'; line: number }
    | { kind: 'expr'; content: string; line: number };

  /**
   * Number of leading whitespace characters on the line containing
   * `pos`, up to but not including `pos`. Used to match block closes
   * against the visually-aligned block open so missing nested closes
   * get flagged on the nested block rather than the outer one.
   */
  function columnIndent(pos: number): number {
    let lineStart = pos;
    while (lineStart > 0 && template[lineStart - 1] !== '\n') lineStart--;
    let n = 0;
    for (let j = lineStart; j < pos; j++) {
      const c = template[j];
      if (c === ' ' || c === '\t') n++;
      else return n;
    }
    return n;
  }

  const tokens: Token[] = [];
  let i = 0;

  /**
   * Find the closing delimiter for the token that starts at `start`.
   * Honors string literals inside expressions so a `}}` inside a
   * quoted string doesn't prematurely terminate the token.
   * Returns the position of the *first* character of the delimiter, or
   * -1 if not found.
   */
  function findClose(start: number, delim: string): number {
    let j = start;
    while (j <= template.length - delim.length) {
      const c = template[j];
      if (c === '"' || c === "'") {
        const quote = c;
        j++;
        while (j < template.length && template[j] !== quote) {
          if (template[j] === '\\') j += 2;
          else j++;
        }
        j++;
        continue;
      }
      if (template.startsWith(delim, j)) return j;
      j++;
    }
    return -1;
  }

  while (i < template.length) {
    // Quad-stash raw block: `{{{{name}}}}...{{{{/name}}}}`
    if (template.startsWith('{{{{', i)) {
      const start = i;
      const closeOpen = template.indexOf('}}}}', i + 4);
      if (closeOpen === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{{{" — missing closing "}}}}"',
        });
        return errors;
      }
      const raw = template.slice(i + 4, closeOpen).trim();
      const line = getLine(start);
      if (raw.startsWith('/')) {
        tokens.push({ kind: 'rawClose', name: raw.slice(1).trim(), line });
      } else {
        tokens.push({ kind: 'rawOpen', name: raw, line });
      }
      i = closeOpen + 4;
      continue;
    }

    // Long-form comment `{{!-- ... --}}` — may contain `}}`.
    if (template.startsWith('{{!--', i)) {
      const start = i;
      const close = template.indexOf('--}}', i + 5);
      if (close === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{!--" — missing closing "--}}"',
        });
        return errors;
      }
      tokens.push({ kind: 'comment', line: getLine(start) });
      i = close + 4;
      continue;
    }

    // Short-form comment `{{! ... }}`.
    if (template.startsWith('{{!', i)) {
      const start = i;
      const close = findClose(i + 3, '}}');
      if (close === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{!" — missing closing "}}"',
        });
        return errors;
      }
      tokens.push({ kind: 'comment', line: getLine(start) });
      i = close + 2;
      continue;
    }

    // Triple-stash `{{{ expr }}}`.
    if (template.startsWith('{{{', i)) {
      const start = i;
      const close = findClose(i + 3, '}}}');
      if (close === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{{" — missing closing "}}}"',
        });
        return errors;
      }
      const content = stripTildes(template.slice(i + 3, close).trim());
      tokens.push({ kind: 'expr', content, line: getLine(start) });
      i = close + 3;
      continue;
    }

    // Regular mustache `{{ expr }}`.
    if (template.startsWith('{{', i)) {
      const start = i;
      const close = findClose(i + 2, '}}');
      if (close === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{" — missing closing "}}"',
        });
        return errors;
      }
      const rawContent = template.slice(i + 2, close);
      const content = stripTildes(rawContent.trim());
      const line = getLine(start);

      if (!content) {
        errors.push({ line, message: 'Empty expression "{{}}"' });
        i = close + 2;
        continue;
      }

      if (content === 'else' || /^else\s+if\b/.test(content)) {
        tokens.push({ kind: 'else', line });
        i = close + 2;
        continue;
      }

      const first = content.charAt(0);
      if (first === '>') {
        tokens.push({ kind: 'partial', line });
        i = close + 2;
        continue;
      }

      if (first === '/') {
        const name = helperName(content.slice(1));
        if (!name) {
          errors.push({ line, message: 'Invalid "{{/}}" — missing block name' });
        } else {
          tokens.push({
            kind: 'blockClose',
            name,
            line,
            indent: columnIndent(start),
          });
        }
        i = close + 2;
        continue;
      }

      // Block open: `#foo`, `^foo`, `#>foo`, `#*inline "…"`.
      if (first === '#' || first === '^') {
        let body = content.slice(1).trimStart();
        if (body.startsWith('>')) body = body.slice(1).trimStart(); // `#>` partial block
        if (body.startsWith('*')) body = body.slice(1).trimStart(); // `#*inline`
        const name = helperName(body);
        if (!name) {
          errors.push({
            line,
            message: `Invalid "{{${first}}}" — missing block name`,
          });
        } else {
          tokens.push({
            kind: 'blockOpen',
            name,
            line,
            indent: columnIndent(start),
            display: `{{${content}}}`,
          });
        }
        i = close + 2;
        continue;
      }

      tokens.push({ kind: 'expr', content, line });
      i = close + 2;
      continue;
    }

    i++;
  }

  type StackEntry = {
    name: string;
    line: number;
    indent: number;
    display: string;
  };
  const blockStack: StackEntry[] = [];
  let rawStackDepth = 0;

  for (const t of tokens) {
    if (rawStackDepth > 0) {
      if (t.kind === 'rawClose') rawStackDepth--;
      if (t.kind === 'rawOpen') rawStackDepth++;
      continue;
    }

    switch (t.kind) {
      case 'rawOpen':
        rawStackDepth++;
        break;
      case 'rawClose':
        errors.push({
          line: t.line,
          message: `Unexpected {{{{/${t.name}}}}} with no matching {{{{${t.name}}}}}`,
        });
        break;
      case 'blockOpen':
        blockStack.push({
          name: t.name,
          line: t.line,
          indent: t.indent,
          display: t.display,
        });
        break;
      case 'blockClose': {
        if (blockStack.length === 0) {
          errors.push({
            line: t.line,
            message: `Unexpected {{/${t.name}}} with no matching {{#${t.name}}}`,
          });
          break;
        }

        // Indent-aware match: walk the stack from top to bottom and
        // take the topmost open that (a) has the same name and (b) is
        // indented no deeper than the close itself. If the user simply
        // deleted the close of a deeper nested block, this attributes
        // the remaining close to the less-indented outer block and
        // flags the nested block (which is what the user expects).
        //
        // When no indent-compatible match exists we fall back to plain
        // LIFO matching so the old behaviour still holds for templates
        // with no useful indentation.
        let matchIdx = -1;
        for (let j = blockStack.length - 1; j >= 0; j--) {
          if (
            blockStack[j].name === t.name &&
            blockStack[j].indent <= t.indent
          ) {
            matchIdx = j;
            break;
          }
        }

        if (matchIdx === -1) {
          // No same-name indent-compatible open — try a looser
          // last-resort search that ignores indent. If even that
          // misses, it's an orphan close.
          for (let j = blockStack.length - 1; j >= 0; j--) {
            if (blockStack[j].name === t.name) {
              matchIdx = j;
              break;
            }
          }
        }

        if (matchIdx === -1) {
          // Name isn't on the stack at all. Report as mismatch
          // against whatever is on top of the stack, which preserves
          // the original "did you mean {{/x}}?" messaging.
          const last = blockStack[blockStack.length - 1];
          errors.push({
            line: t.line,
            message: `Mismatched {{/${t.name}}} — expected {{/${last.name}}} to close block opened on line ${last.line}`,
          });
          blockStack.pop();
          break;
        }

        // Anything above the matched index is now known to be
        // unclosed, because the close we just saw closes a deeper
        // ancestor. Flag each of them once here so the error lands on
        // the block whose close is actually missing.
        for (let j = blockStack.length - 1; j > matchIdx; j--) {
          const unclosed = blockStack[j];
          errors.push({
            line: unclosed.line,
            message: `Unclosed ${unclosed.display} — missing {{/${unclosed.name}}} before the {{/${t.name}}} on line ${t.line}`,
          });
        }
        blockStack.length = matchIdx;
        break;
      }
      case 'else':
        if (blockStack.length === 0) {
          errors.push({
            line: t.line,
            message: '{{else}} outside of any {{#if}} / {{#each}} / {{#unless}} block',
          });
        }
        break;
      default:
        break;
    }
  }

  for (const block of blockStack) {
    errors.push({
      line: block.line,
      message: `Unclosed ${block.display} — missing {{/${block.name}}}`,
    });
  }

  return errors.sort((a, b) => a.line - b.line || a.message.localeCompare(b.message));
}

/**
 * Strip leading/trailing `~` whitespace-control markers from a token's
 * trimmed content. Handlebars allows `{{~#if foo~}}` and similar.
 */
function stripTildes(content: string): string {
  let s = content;
  if (s.startsWith('~')) s = s.slice(1).trimStart();
  if (s.endsWith('~')) s = s.slice(0, -1).trimEnd();
  return s;
}

/**
 * Extract a helper name from the start of an expression body. Accepts
 * quoted names (e.g. `{{#*inline "foo"}}`) and hyphenated names
 * (e.g. `raw-helper`).
 */
function helperName(body: string): string | null {
  const s = body.trimStart();
  if (!s) return null;
  if (s.startsWith('"') || s.startsWith("'")) {
    const quote = s.charAt(0);
    const end = s.indexOf(quote, 1);
    if (end === -1) return null;
    return s.slice(1, end);
  }
  const m = s.match(/^[A-Za-z_][\w.\-/]*/);
  return m ? m[0] : null;
}
