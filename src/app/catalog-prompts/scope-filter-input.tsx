'use client';

import type { PromptKind } from '@/lib/catalog-feed-client';
import { useEffect, useId, useMemo, useState } from 'react';

import type { ScopeOption } from './propose-form';

interface ScopeFilterInputProps {
  defaultValue: string;
  availableScopes: ScopeOption[];
  initialKind: PromptKind | '';
}

// ScopeFilterInput is the client-side counterpart to the page filter's
// scope <input>. The parent form is a plain GET form (so the URL drives
// pagination/state and SSR works out of the box), which means we can't
// pass kind in via React props once the user changes it. Instead we
// observe the sibling kind <select> by id and re-narrow the suggestion
// list whenever its value changes. This keeps the page-level filter and
// the propose-new-prompt form behaviour in lock-step without forcing
// the whole filter form into a client component.
export function ScopeFilterInput({
  defaultValue,
  availableScopes,
  initialKind,
}: ScopeFilterInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [kind, setKind] = useState<PromptKind | ''>(initialKind);
  const datalistId = useId();

  useEffect(() => {
    // The kind <select> in the parent form has name="kind"; we hook into
    // its change event so the datalist narrows in real time even though
    // the form itself is uncontrolled.
    const form = document.querySelector<HTMLFormElement>('form');
    if (!form) return;
    const select = form.querySelector<HTMLSelectElement>('select[name="kind"]');
    if (!select) return;
    const handler = () => setKind(select.value as PromptKind | '');
    select.addEventListener('change', handler);
    return () => select.removeEventListener('change', handler);
  }, []);

  const scopeOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const opt of availableScopes) {
      if (kind && opt.kind !== kind) continue;
      if (seen.has(opt.scope)) continue;
      seen.add(opt.scope);
      out.push(opt.scope);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [availableScopes, kind]);

  return (
    <>
      <input
        name="scope"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          scopeOptions.length > 0
            ? `Search ${scopeOptions.length} scope${scopeOptions.length === 1 ? '' : 's'}…`
            : 'tear_sheet:faucets, judge:line_drawing…'
        }
        list={datalistId}
        autoComplete="off"
        className="focus:border-primary-500 focus:ring-primary-500 mt-1 w-full rounded-md border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-xs"
      />
      <datalist id={datalistId}>
        {scopeOptions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
