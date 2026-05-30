'use client';

import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { PlusIcon, TrashIcon } from '@/components/ui/icons';

// Editor-only row: carries a stable client id for React keys. Stripped back to
// the bare `{ product, style }` API shape at the request boundary.
export interface StyleOverrideRow {
  id: string;
  product: string;
  style: string;
}

interface StyleOverridesEditorProps {
  value: StyleOverrideRow[];
  onChange: (next: StyleOverrideRow[]) => void;
}

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function StyleOverridesEditor({ value, onChange }: StyleOverridesEditorProps) {
  const addRow = () => onChange([...value, { id: crypto.randomUUID(), product: '', style: '' }]);
  const updateRow = (index: number, patch: Partial<StyleOverrideRow>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const removeRow = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={LABEL_CLASS}>Style overrides</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          iconLeft={<PlusIcon className="size-4" />}
          onClick={addRow}
        >
          Add override
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-body text-text-muted">No style overrides.</p>
      ) : (
        <div className="space-y-2">
          {value.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <TextInput
                value={row.product}
                onChange={(e) => updateRow(index, { product: e.target.value })}
                placeholder="Product"
              />
              <TextInput
                value={row.style}
                onChange={(e) => updateRow(index, { style: e.target.value })}
                placeholder="Style"
              />
              <IconButton
                label="Remove override"
                icon={<TrashIcon className="size-4" />}
                onClick={() => removeRow(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
