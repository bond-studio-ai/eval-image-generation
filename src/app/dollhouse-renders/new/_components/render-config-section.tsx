'use client';

import { Checkbox, FormSection, SegmentedControl } from '@/components/ui';
import { RENDER_MODE_OPTIONS, type RenderConfigState } from './build-request';
import { NumberInput } from './number-input';

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function RenderConfigSection({
  value,
  onChange,
}: {
  value: RenderConfigState;
  onChange: (next: RenderConfigState) => void;
}) {
  return (
    <FormSection title="Render config" description="Optional render-pipeline overrides.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className={LABEL_CLASS}>Render mode</span>
          <SegmentedControl
            options={RENDER_MODE_OPTIONS}
            value={value.renderMode}
            onChange={(renderMode) => onChange({ ...value, renderMode })}
            label="Render mode"
          />
        </div>
        <div>
          <span className={LABEL_CLASS}>Advanced segmentation</span>
          <div className="mt-1">
            <Checkbox
              checked={value.advancedSegmentation}
              onChange={(e) => onChange({ ...value, advancedSegmentation: e.target.checked })}
              label="Enable advanced segmentation"
            />
          </div>
        </div>
        <NumberInput
          label="Override camera height"
          hint="Optional. In world units."
          value={value.overrideCameraHeight}
          onChange={(overrideCameraHeight) => onChange({ ...value, overrideCameraHeight })}
          optional
          allowDecimal
        />
      </div>
    </FormSection>
  );
}
