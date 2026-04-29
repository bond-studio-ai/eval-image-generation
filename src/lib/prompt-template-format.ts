import type { PromptKind } from '@/lib/catalog-feed-client';

/**
 * Catalog prompts are stored as a JSON envelope so the (system, user)
 * pair round-trips losslessly through a single TEXT column. The
 * resolver in service-catalog-feed mirrors this format —
 * `usecases/ai/prompts/resolver.go::templateEnvelope`.
 *
 * Legacy rows (predating the resolver package) were written as a
 * plain "system\n---\nuser" string by the audit code's
 * recordExtractRun. Even older rows were a single string on one side.
 * decodePromptTemplate handles all three shapes so the UI can render
 * the same admin surface regardless of when the prompt was minted.
 */
export interface PromptEnvelope {
  system: string;
  user: string;
  /** Raw shape detected so the form can warn the operator before
   *  accidentally rewriting a legacy row into an envelope. */
  source: 'json' | 'legacy-divider' | 'plain';
}

export function decodePromptTemplate(raw: string): PromptEnvelope {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { system: '', user: '', source: 'json' };
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { system?: unknown; user?: unknown };
      const system = typeof parsed.system === 'string' ? parsed.system : '';
      const user = typeof parsed.user === 'string' ? parsed.user : '';
      // Only treat it as a JSON envelope if at least one side is a
      // string. A bare `{}` or unrelated JSON falls through to the
      // plain-text branch so we never silently swallow content.
      if (system || user || (parsed && Object.keys(parsed).length === 0)) {
        return { system, user, source: 'json' };
      }
    } catch {
      // fall through to legacy detection
    }
  }
  const dividerIdx = raw.indexOf('\n---\n');
  if (dividerIdx >= 0) {
    return {
      system: raw.slice(0, dividerIdx),
      user: raw.slice(dividerIdx + '\n---\n'.length),
      source: 'legacy-divider',
    };
  }
  return { system: '', user: raw, source: 'plain' };
}

/**
 * Re-encode an edited (system, user) pair into the JSON envelope the
 * backend expects. Whitespace is preserved exactly; an empty system
 * is allowed (some prompts ship a single user instruction only).
 */
export function encodePromptTemplate(system: string, user: string): string {
  return JSON.stringify({ system, user });
}

/** A single token in a Go text/template stream. The tokenizer keeps
 *  the original `raw` text for every token so a round-trip
 *  highlight + edit never alters the underlying string. */
export type TemplateToken =
  | { kind: 'text'; raw: string }
  | { kind: 'variable'; raw: string; name: string }
  | { kind: 'directive'; raw: string; name: 'if' | 'else' | 'end' | 'range' | 'with' | 'block' | 'define' | 'template' }
  | { kind: 'expression'; raw: string };

const ACTION_RE = /\{\{[\s\S]*?\}\}/g;
const SIMPLE_VAR_RE = /^\.[A-Za-z_][\w.]*$/;
const KEYWORDS: Record<string, Extract<TemplateToken, { kind: 'directive' }>['name']> = {
  if: 'if',
  else: 'else',
  end: 'end',
  range: 'range',
  with: 'with',
  block: 'block',
  define: 'define',
  template: 'template',
};

/**
 * Tokenize a Go text/template string into literal text segments and
 * action segments. Action segments are further classified as:
 *   - variable     `{{.FieldName}}` or `{{.Nested.Field}}` — bound to a typed input.
 *   - directive    `{{if …}}`, `{{else}}`, `{{end}}`, `{{range …}}`, etc.
 *   - expression   anything else inside `{{…}}` (ranges of pipelines,
 *                  function calls like `{{or .X .Y}}`, etc.). Surfaced
 *                  separately from variables so the highlighter can
 *                  give them a distinct, less-prominent style.
 *
 * The implementation is a single pass over the input and never
 * mutates the string. The greedy match on `\{\{[\s\S]*?\}\}` means
 * unmatched `{{` segments fall through to the plain-text branch,
 * matching Go's template parser failure behaviour at runtime.
 */
export function tokenizePromptTemplate(template: string): TemplateToken[] {
  const out: TemplateToken[] = [];
  let last = 0;
  ACTION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ACTION_RE.exec(template)) !== null) {
    const idx = match.index;
    if (idx > last) {
      out.push({ kind: 'text', raw: template.slice(last, idx) });
    }
    const raw = match[0];
    const inner = raw.slice(2, -2).trim();
    if (SIMPLE_VAR_RE.test(inner)) {
      out.push({ kind: 'variable', raw, name: inner.slice(1) });
    } else {
      const head = inner.split(/\s+/)[0] ?? '';
      const directive = KEYWORDS[head];
      if (directive) {
        out.push({ kind: 'directive', raw, name: directive });
      } else {
        out.push({ kind: 'expression', raw });
      }
    }
    last = idx + raw.length;
  }
  if (last < template.length) {
    out.push({ kind: 'text', raw: template.slice(last) });
  }
  return out;
}

/** Pull every distinct {{.Field}} reference out of a template. The
 *  resulting names mirror the typed Go struct fields one-for-one and
 *  are surfaced in the detail page's "Variables in use" pill row. */
export function extractReferencedVariables(template: string): string[] {
  const seen = new Set<string>();
  for (const token of tokenizePromptTemplate(template)) {
    if (token.kind === 'variable') {
      // Top-level field name only (Title, ProductTypeLabel, …) so the
      // pill row can match against the variable registry. Nested
      // accesses like `.Foo.Bar` collapse to `Foo` for grouping.
      const top = token.name.split('.')[0];
      if (top) seen.add(top);
    }
  }
  return [...seen].sort();
}

export interface PromptVariable {
  name: string;
  /** Go-side type label (e.g. `string`, `float64`, `*bool`). Shown in
   *  the dropdown so an admin can see what shape they're injecting. */
  type: string;
  description: string;
  /** Optional grouping for the SearchableSelect. Variables in the
   *  same group render under a shared header in the dropdown. */
  group: string;
  /** True when the field is product-type specific within a shared
   *  context (e.g. ProceduralContext) so the dropdown can flag it
   *  visually. The renderer still allows insertion since the
   *  template's `{{if .Field}}…{{end}}` guards make it safe. */
  productSpecific?: boolean;
}

const GENERATION_VARIABLES: PromptVariable[] = [
  {
    name: 'ProductTypeLabel',
    type: 'string',
    description: 'Human-readable noun for the product type (e.g. "vanity", "faucet"). Falls back to the productType slug.',
    group: 'GenerationData',
  },
  {
    name: 'Width',
    type: 'float64',
    description: 'Requested image width in product units. 0 when absent.',
    group: 'GenerationData',
  },
  {
    name: 'Height',
    type: 'float64',
    description: 'Requested image height in product units. 0 when absent.',
    group: 'GenerationData',
  },
  {
    name: 'Length',
    type: 'float64',
    description: 'Requested image length in product units. 0 when absent.',
    group: 'GenerationData',
  },
];

const JUDGE_VARIABLES: PromptVariable[] = [
  {
    name: 'ProductName',
    type: 'string',
    description: 'Resolved product name shown to the judge model alongside the rendered image.',
    group: 'JudgeData',
  },
  {
    name: 'NumberOfSinks',
    type: 'int',
    description: 'Sink count declared in productContext. Used by vanity judges; 0 elsewhere.',
    group: 'JudgeData',
  },
];

const STYLE_EXTRACTION_VARIABLES: PromptVariable[] = [
  {
    name: 'Title',
    type: 'string',
    description: 'Product title from the catalogue. Empty when the catalogue has no title for the product.',
    group: 'aidomain.Context',
  },
  {
    name: 'Description',
    type: 'string',
    description: 'Product description from the catalogue. Empty when absent.',
    group: 'aidomain.Context',
  },
];

const PROCEDURAL_VARIABLES: PromptVariable[] = [
  {
    name: 'ManufacturerColorFinish',
    type: 'string',
    description: 'Manufacturer-declared color/finish. Optional.',
    group: 'ProceduralContext (shared)',
  },
  {
    name: 'MaterialDescription',
    type: 'string',
    description: 'Manufacturer-declared material description. Optional.',
    group: 'ProceduralContext (shared)',
  },
  {
    name: 'TopColor',
    type: 'string',
    description: 'Vanity countertop color.',
    group: 'ProceduralContext (vanities)',
    productSpecific: true,
  },
  {
    name: 'TopMaterial',
    type: 'string',
    description: 'Vanity countertop material.',
    group: 'ProceduralContext (vanities)',
    productSpecific: true,
  },
  {
    name: 'SinkColor',
    type: 'string',
    description: 'Vanity sink color.',
    group: 'ProceduralContext (vanities)',
    productSpecific: true,
  },
  {
    name: 'SinkMaterial',
    type: 'string',
    description: 'Vanity sink material.',
    group: 'ProceduralContext (vanities)',
    productSpecific: true,
  },
  {
    name: 'ShadeColor',
    type: 'string',
    description: 'Lighting shade color.',
    group: 'ProceduralContext (lightings)',
    productSpecific: true,
  },
  {
    name: 'ShadeMaterial',
    type: 'string',
    description: 'Lighting shade material.',
    group: 'ProceduralContext (lightings)',
    productSpecific: true,
  },
  {
    name: 'IsMosaic',
    type: '*bool',
    description: 'Whether the tile is a mosaic. Tile-only.',
    group: 'ProceduralContext (tiles)',
    productSpecific: true,
  },
];

/**
 * Return the typed variables available to the prompt at runtime,
 * inferred from the prompt's (kind, scope). The mapping mirrors the
 * resolver in service-catalog-feed:
 *
 *   - kind=generation                                  → GenerationData
 *   - kind=judge                                       → JudgeData
 *   - kind=extraction, scope=`procedural::*`           → ProceduralContext
 *   - kind=extraction, scope=`mosaic_grid`             → none (no inputs)
 *   - kind=extraction, scope=`<productType>:image-extraction`
 *                                                       → aidomain.Context
 *   - kind=meta                                        → none
 *
 * Unknown shapes return an empty array so the dropdown silently
 * collapses rather than offering bogus variables.
 */
export function variablesForPrompt(kind: PromptKind, scope: string): PromptVariable[] {
  if (kind === 'generation') return GENERATION_VARIABLES;
  if (kind === 'judge') return JUDGE_VARIABLES;
  if (kind === 'extraction') {
    if (scope.startsWith('procedural::')) return PROCEDURAL_VARIABLES;
    if (scope === 'mosaic_grid') return [];
    return STYLE_EXTRACTION_VARIABLES;
  }
  return [];
}

/** Convenience: return the variable registered for `name`, or
 *  undefined if the template references a name that the registry does
 *  not know about (legacy alias, typo, future field). The caller can
 *  use this to flag stale references in the detail view. */
export function findVariable(
  variables: PromptVariable[],
  name: string,
): PromptVariable | undefined {
  return variables.find((v) => v.name === name);
}
