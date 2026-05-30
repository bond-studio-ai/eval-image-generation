'use client';

import { FormSection } from '@/components/ui/form-section';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { FORMAT_OPTIONS, type ImageConfigState } from './build-request';
import { NumberInput } from './number-input';

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function ImageConfigSection({
  value,
  onChange,
}: {
  value: ImageConfigState;
  onChange: (next: ImageConfigState) => void;
}) {
  return (
    <FormSection title="Image config" description="Output image dimensions and format.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className={LABEL_CLASS}>Format</span>
          <SegmentedControl
            options={FORMAT_OPTIONS}
            value={value.format}
            onChange={(format) => onChange({ ...value, format })}
            label="Output image format"
          />
        </div>
        <NumberInput
          label="Width"
          value={value.width}
          onChange={(width) => onChange({ ...value, width })}
          min={1}
        />
        <NumberInput
          label="Height"
          value={value.height}
          onChange={(height) => onChange({ ...value, height })}
          min={1}
        />
        <NumberInput
          label="Super-sampling multiplier"
          hint="Optional. Renders at N× and downsamples."
          value={value.superSamplingMultiplier}
          onChange={(superSamplingMultiplier) => onChange({ ...value, superSamplingMultiplier })}
          min={1}
          optional
        />
      </div>
    </FormSection>
  );
}
