"use client";

import { Field, TextInput } from "@/components/ui/field";

export interface SsmParamsState {
  addressablesCatalog: string;
  host: string;
  uploadBucket: string;
}

const LABEL_CLASS = "text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide";

export function SsmParamsEditor({ value, onChange }: { value: SsmParamsState; onChange: (next: SsmParamsState) => void }) {
  const set = (patch: Partial<SsmParamsState>) => {
    onChange({ ...value, ...patch });
  };
  return (
    <div>
      <p className={LABEL_CLASS}>SSM params</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Addressables catalog" optional>
          {(id) => (
            <TextInput
              id={id}
              value={value.addressablesCatalog}
              onChange={(e) => {
                set({ addressablesCatalog: e.target.value });
              }}
              placeholder="Optional"
            />
          )}
        </Field>
        <Field label="Host" optional>
          {(id) => (
            <TextInput
              id={id}
              value={value.host}
              onChange={(e) => {
                set({ host: e.target.value });
              }}
              placeholder="Optional"
            />
          )}
        </Field>
        <Field label="Upload bucket" optional>
          {(id) => (
            <TextInput
              id={id}
              value={value.uploadBucket}
              onChange={(e) => {
                set({ uploadBucket: e.target.value });
              }}
              placeholder="Optional"
            />
          )}
        </Field>
      </div>
    </div>
  );
}
