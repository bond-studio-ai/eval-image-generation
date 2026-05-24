'use client';

import { Button, FormSection } from '@/components/ui';
import type { DollhouseStyleOverride } from '@/lib/dollhouse-renders';
import { useState } from 'react';
import { SsmParamsEditor, type SsmParamsState } from './ssm-params-editor';
import { StyleOverridesEditor } from './style-overrides-editor';

export function AdvancedSection({
  styleOverrides,
  onStyleOverridesChange,
  ssmParams,
  onSsmParamsChange,
}: {
  styleOverrides: DollhouseStyleOverride[];
  onStyleOverridesChange: (next: DollhouseStyleOverride[]) => void;
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
