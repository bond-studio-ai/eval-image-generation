'use client';

import {
  findVariable,
  tokenizePromptTemplate,
  type PromptVariable,
} from '@/lib/prompt-template-format';
import { Fragment } from 'react';

interface PromptTemplateDisplayProps {
  /** Raw template source (a single side of the system/user pair). */
  template: string;
  /** Variables available to this prompt at runtime. Used to attach
   *  human-readable hover descriptions and to flag references that
   *  the registry does not know about (typos, drift). */
  variables: PromptVariable[];
  /** Empty-state fallback rendered when the side is empty (e.g. a
   *  prompt that ships only a user instruction has no system side). */
  emptyMessage?: string;
}

/**
 * PromptTemplateDisplay renders a Go text/template string in
 * human-readable form: literal text flows like prose, `{{.Field}}`
 * references render as colored chips with a hover tooltip describing
 * the typed value the worker injects, and `{{if …}} / {{end}}`
 * directives render as muted brackets so an admin can see the
 * conditional structure without parsing braces by eye.
 *
 * The renderer never touches the underlying string — it only
 * decorates it — so copy-paste from the page yields the same source
 * that the worker reads at runtime.
 */
export function PromptTemplateDisplay({
  template,
  variables,
  emptyMessage = '— empty —',
}: PromptTemplateDisplayProps) {
  if (!template) {
    return (
      <p className="rounded-md bg-gray-50 px-3 py-3 text-xs italic text-gray-400">
        {emptyMessage}
      </p>
    );
  }
  const tokens = tokenizePromptTemplate(template);
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
      {tokens.map((token, idx) => {
        if (token.kind === 'text') {
          return <Fragment key={idx}>{token.raw}</Fragment>;
        }
        if (token.kind === 'variable') {
          const segments = token.name.split('.');
          const top = segments[0];
          const meta = findVariable(variables, top);
          const known = !!meta;
          const isNested = segments.length > 1;
          // Three visual states:
          //   - known top-level: emerald chip with full type/description.
          //   - known nested:    emerald chip but the tooltip MUST cite
          //     the full path the chip displays (`.Foo.Bar`) and call
          //     out that the registry only documents the top-level
          //     field. Showing `meta.name: meta.type` without context
          //     would imply the typed value of `.Foo` even though
          //     the chip references a nested member.
          //   - unknown: amber chip so the admin sees the drift at a
          //     glance without breaking the page.
          let tooltip: string;
          if (meta && !isNested) {
            tooltip = `.${meta.name}: ${meta.type}\n\n${meta.description}`;
          } else if (meta && isNested) {
            tooltip =
              `.${token.name} (nested access of .${meta.name})\n\n` +
              `.${meta.name} is documented as ${meta.type} in the registry, but the chip references the nested path ` +
              `.${token.name}. The runtime type/value depends on the leaf field, which the registry does not document. ` +
              `Verify the path against the worker's data struct before approving.`;
          } else {
            tooltip =
              `.${token.name} is not in the documented variable registry for this prompt kind/scope. ` +
              `The worker will render it as the type's zero value (or fail at runtime if the field does not exist on the data struct).`;
          }
          return (
            <span
              key={idx}
              title={tooltip}
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 align-baseline font-mono text-[12px] font-medium ${
                known
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                  : 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
              }`}
            >
              {token.raw}
            </span>
          );
        }
        if (token.kind === 'directive') {
          return (
            <span
              key={idx}
              title={`Go template control flow ({{${token.name}}}). Renders nothing at runtime — it gates the surrounding text.`}
              className="inline-flex items-center rounded-md bg-violet-100 px-1.5 py-0.5 align-baseline font-mono text-[12px] font-medium text-violet-800 ring-1 ring-violet-200"
            >
              {token.raw}
            </span>
          );
        }
        // Generic expression (function call, pipeline). Distinct from
        // both bare variables and directives so the admin can see
        // that this segment is doing something more than a typed
        // field lookup.
        return (
          <span
            key={idx}
            title="Go template expression (pipeline / function call). Output depends on the data struct at runtime."
            className="inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 align-baseline font-mono text-[12px] font-medium text-sky-800 ring-1 ring-sky-200"
          >
            {token.raw}
          </span>
        );
      })}
    </div>
  );
}
