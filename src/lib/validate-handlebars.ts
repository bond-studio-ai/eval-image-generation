export type TemplateError = {
  line: number;
  message: string;
};

/**
 * Lightweight validator for Handlebars-style templates.
 * Detects unclosed expressions, mismatched block helpers, and empty expressions.
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

  type Expr = { content: string; line: number };
  const expressions: Expr[] = [];

  let i = 0;
  while (i < template.length - 1) {
    if (template[i] === '{' && template[i + 1] === '{') {
      const start = i;
      const tripleClose = template.indexOf('}}}', i + 2);
      const doubleClose = template.indexOf('}}', i + 2);

      if (doubleClose === -1) {
        errors.push({
          line: getLine(start),
          message: 'Unclosed "{{" — missing closing "}}"',
        });
        break;
      }

      let content: string;
      let endPos: number;
      if (template[i + 2] === '{') {
        // Triple-stash {{{ ... }}}
        if (tripleClose !== -1 && tripleClose <= doubleClose) {
          content = template.slice(start + 3, tripleClose).trim();
          endPos = tripleClose + 3;
        } else {
          content = template.slice(start + 2, doubleClose).trim();
          endPos = doubleClose + 2;
        }
      } else {
        content = template.slice(start + 2, doubleClose).trim();
        endPos = doubleClose + 2;
      }

      expressions.push({ content, line: getLine(start) });
      i = endPos;
    } else {
      i++;
    }
  }

  const blockStack: { type: string; line: number }[] = [];

  for (const expr of expressions) {
    if (!expr.content) {
      errors.push({ line: expr.line, message: 'Empty expression "{{}}"' });
      continue;
    }

    const blockOpen = expr.content.match(/^#(\w+)/);
    if (blockOpen) {
      blockStack.push({ type: blockOpen[1], line: expr.line });
      continue;
    }

    const blockClose = expr.content.match(/^\/(\w+)/);
    if (blockClose) {
      const closeType = blockClose[1];
      if (blockStack.length === 0) {
        errors.push({
          line: expr.line,
          message: `Unexpected {{/${closeType}}} with no matching {{#${closeType}}}`,
        });
      } else {
        const last = blockStack[blockStack.length - 1];
        if (last.type !== closeType) {
          errors.push({
            line: expr.line,
            message: `Mismatched {{/${closeType}}} — expected {{/${last.type}}} to close block opened on line ${last.line}`,
          });
          blockStack.pop();
        } else {
          blockStack.pop();
        }
      }
    }
  }

  for (const block of blockStack) {
    errors.push({
      line: block.line,
      message: `Unclosed {{#${block.type}}} — missing {{/${block.type}}}`,
    });
  }

  return errors;
}
