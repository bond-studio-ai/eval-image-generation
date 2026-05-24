'use client';

import { Button, IconButton, PlusIcon, TextInput, TrashIcon } from '@/components/ui';
import type { DollhouseStyleOverride } from '@/lib/dollhouse-renders';

interface StyleOverridesEditorProps {
  value: DollhouseStyleOverride[];
  onChange: (next: DollhouseStyleOverride[]) => void;
}

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function StyleOverridesEditor({ value, onChange }: StyleOverridesEditorProps) {
  const addRow = () => onChange([...value, { product: '', style: '' }]);
  const updateRow = (index: number, patch: Partial<DollhouseStyleOverride>) =>
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
          iconLeft={<PlusIcon className="h-4 w-4" />}
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
            <div key={index} className="flex items-center gap-2">
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
                icon={<TrashIcon className="h-4 w-4" />}
                onClick={() => removeRow(index)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
