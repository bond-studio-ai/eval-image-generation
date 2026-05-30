'use client';

import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { useState } from 'react';
import { SsmParamsEditor, type SsmParamsState } from './ssm-params-editor';
import { StyleOverridesEditor, type StyleOverrideRow } from './style-overrides-editor';

export function AdvancedSection({
  styleOverrides,
  onStyleOverridesChange,
  ssmParams,
  onSsmParamsChange,
}: {
  styleOverrides: StyleOverrideRow[];
  onStyleOverridesChange: (next: StyleOverrideRow[]) => void;
  ssmParams: SsmParamsState;
  onSsmParamsChange: (next: SsmParamsState) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormSection
      title="Advanced"
      description="Optional style overrides and SSM parameters."
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show'}
        </Button>
      }
    >
      {open ? (
        <div className="space-y-6">
          <StyleOverridesEditor value={styleOverrides} onChange={onStyleOverridesChange} />
          <SsmParamsEditor value={ssmParams} onChange={onSsmParamsChange} />
        </div>
      ) : (
        <p className="text-body text-text-muted">
          Advanced parameters are hidden. Click Show to edit style overrides and SSM configuration.
        </p>
      )}
    </FormSection>
  );
}
