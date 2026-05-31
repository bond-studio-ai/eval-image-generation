"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { SsmParamsEditor, type SsmParamsState } from "./ssm-params-editor";
import { type StyleOverrideRow, StyleOverridesEditor } from "./style-overrides-editor";

export function AdvancedSection({
  styleOverrides,
  onStyleOverridesChange,
  ssmParams,
  onSsmParamsChange
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen((prev) => !prev);
          }}
        >
          {open ? "Hide" : "Show"}
        </Button>
      }
    >
      {open ? (
        <div className="space-y-6">
          <StyleOverridesEditor value={styleOverrides} onChange={onStyleOverridesChange} />
          <SsmParamsEditor value={ssmParams} onChange={onSsmParamsChange} />
        </div>
      ) : (
        <p className="text-body text-text-muted">Advanced parameters are hidden. Click Show to edit style overrides and SSM configuration.</p>
      )}
    </FormSection>
  );
}
