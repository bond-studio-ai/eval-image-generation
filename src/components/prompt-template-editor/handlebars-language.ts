import { HighlightStyle, StreamLanguage, type StreamParser, type StringStream, syntaxHighlighting } from "@codemirror/language";
import { Tag } from "@lezer/highlight";

/**
 * A minimal CodeMirror 6 StreamLanguage for Handlebars templates. It reproduces
 * the same five-way classification the previous regex overlay used:
 *   - `{{! ... }}` / `{{!-- ... --}}` → comment
 *   - `{{#...}}` / `{{/...}}` / `{{^...}}` / `{{else}}` → block keyword
 *   - `{{> ...}}` → partial
 *   - `{{{ ... }}}` / `{{{{ ... }}}}` → unescaped
 *   - `{{ ... }}` → regular expression
 *
 * Tokens may span multiple lines (long-form comments, blocks): the parser state
 * carries the pending kind and its closing delimiter across line breaks.
 *
 * Why not `@codemirror/lang-handlebars`? That package parses Handlebars embedded
 * in *HTML* (it delegates the non-mustache text to an HTML grammar). Our content
 * is free-text LLM prompts, not markup, so the HTML parser would mis-highlight
 * the surrounding prose. We only need to color the mustache regions and leave the
 * prose untouched, which this self-contained tokenizer does without pulling in an
 * HTML grammar (or an extra dependency). Owning this small lexer is intentional.
 */

type HandlebarsKind = "comment" | "block" | "partial" | "expr" | "unescaped";

interface HbsState {
  pending: HandlebarsKind | null;
  close: string;
}

const TOKEN_NAME: Record<HandlebarsKind, string> = {
  comment: "hbsComment",
  block: "hbsBlock",
  partial: "hbsPartial",
  expr: "hbsExpr",
  unescaped: "hbsUnescaped"
};

const hbsTags = {
  comment: Tag.define(),
  block: Tag.define(),
  partial: Tag.define(),
  expr: Tag.define(),
  unescaped: Tag.define()
};

/** Classify a regular `{{ ... }}` token by its first meaningful character. */
function classifyRegular(rest: string): HandlebarsKind {
  const match = /^[~\s]*(\S)/.exec(rest);
  const first = match ? match[1] : "";
  if (first === "#" || first === "/" || first === "^") return "block";
  if (first === ">") return "partial";
  if (/^[~\s]*else\b/.test(rest)) return "block";
  return "expr";
}

/**
 * Consume characters until `state.close` is found (inclusive) and return the
 * token name. If the line ends first, leave `state.pending` set so the next
 * line resumes the same token.
 */
function consumeToClose(stream: StringStream, state: HbsState, kind: HandlebarsKind): string {
  while (!stream.eol()) {
    // `stream` is a CodeMirror StringStream; `.match` advances the cursor and is not String#match.
    // eslint-disable-next-line unicorn/prefer-regexp-test -- StringStream.match, not String#match
    if (stream.match(state.close)) {
      state.pending = null;
      state.close = "";
      return TOKEN_NAME[kind];
    }
    stream.next();
  }
  state.pending = kind;
  return TOKEN_NAME[kind];
}

const handlebarsParser: StreamParser<HbsState> = {
  startState: () => ({ pending: null, close: "" }),
  token: (stream, state) => {
    if (state.pending) return consumeToClose(stream, state, state.pending);

    if (stream.match("{{!--")) {
      state.close = "--}}";
      return consumeToClose(stream, state, "comment");
    }
    if (stream.match("{{!")) {
      state.close = "}}";
      return consumeToClose(stream, state, "comment");
    }
    if (stream.match("{{{{")) {
      state.close = "}}}}";
      return consumeToClose(stream, state, "unescaped");
    }
    if (stream.match("{{{")) {
      state.close = "}}}";
      return consumeToClose(stream, state, "unescaped");
    }
    if (stream.match("{{")) {
      const kind = classifyRegular(stream.string.slice(stream.pos));
      state.close = "}}";
      return consumeToClose(stream, state, kind);
    }

    // Plain text: advance to the next mustache (or end of line).
    stream.next();
    while (!stream.eol() && !stream.match("{{", false)) stream.next();
    return null;
  },
  tokenTable: {
    hbsComment: hbsTags.comment,
    hbsBlock: hbsTags.block,
    hbsPartial: hbsTags.partial,
    hbsExpr: hbsTags.expr,
    hbsUnescaped: hbsTags.unescaped
  }
};

export const handlebarsLanguage = StreamLanguage.define(handlebarsParser);

const handlebarsHighlightStyle = HighlightStyle.define([
  { tag: hbsTags.comment, color: "var(--color-text-disabled)", fontStyle: "italic" },
  { tag: hbsTags.block, color: "var(--color-accent-700)", fontWeight: "500" },
  { tag: hbsTags.partial, color: "var(--color-success-700)" },
  { tag: hbsTags.expr, color: "var(--color-primary-700)" },
  { tag: hbsTags.unescaped, color: "var(--color-warning-700)" }
]);

export const handlebarsHighlighting = syntaxHighlighting(handlebarsHighlightStyle);
