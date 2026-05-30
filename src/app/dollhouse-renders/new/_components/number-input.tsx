'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { Field, TextInput } from '@/components/ui/field';

interface NumberInputProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  min?: number;
  optional?: boolean;
  /** Accept decimals (e.g. camera-height overrides). Default is integers only. */
  allowDecimal?: boolean;
}

const INTEGER_RE = /^\d*$/;
const DECIMAL_RE = /^-?\d*\.?\d*$/;

/**
 * Numeric `<input type="text">` with regex-constrained editing, so the field
 * silently rejects non-numeric keystrokes instead of producing the awkward
 * `<input type="number">` spinner+stepper UI. Returns the raw string; callers
 * parse it when assembling the request body so they control the int/float/zero
 * coercion policy.
 */
export function NumberInput({
  label,
  value,
  onChange,
  hint,
  min,
  optional,
  allowDecimal,
}: NumberInputProps) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const re = allowDecimal ? DECIMAL_RE : INTEGER_RE;
    if (re.test(raw)) onChange(raw);
  };

  return (
    <Field label={label} hint={hint} optional={optional}>
      {(id) => (
        <TextInput
          id={id}
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={value}
          onChange={handle}
          min={min}
        />
      )}
    </Field>
  );
}
