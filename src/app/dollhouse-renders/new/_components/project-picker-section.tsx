'use client';

import { ErrorCard } from '@/components/resource-form-header';
import { Button, Field, FormSection, TextInput } from '@/components/ui';
import { ProjectPickerTable } from '../project-picker-table';

interface ProjectPickerSectionProps {
  projectIdInput: string;
  onProjectIdInputChange: (value: string) => void;
  onLoadManualInput: () => void;
  onSelectFromTable: (projectId: string) => void;
  loadingProject: boolean;
  projectError: string | null;
  selectedProjectId: string | null;
}

const LABEL_CLASS =
  'text-caption text-text-secondary mb-1 block font-medium uppercase tracking-wide';

export function ProjectPickerSection({
  projectIdInput,
  onProjectIdInputChange,
  onLoadManualInput,
  onSelectFromTable,
  loadingProject,
  projectError,
  selectedProjectId,
}: ProjectPickerSectionProps) {
  return (
    <FormSection title="Project" description="Paste a project ID or pick one from the list below.">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Project ID">
            {(id) => (
              <TextInput
                id={id}
                value={projectIdInput}
                onChange={(e) => onProjectIdInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onLoadManualInput();
                  }
                }}
                placeholder="PRJ-..."
              />
            )}
          </Field>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onLoadManualInput}
          disabled={!projectIdInput.trim() || loadingProject}
          loading={loadingProject}
        >
          Use this project
        </Button>
      </div>

      {projectError && (
        <div className="mt-4">
          <ErrorCard message={projectError} />
        </div>
      )}

      <div className="mt-6">
        <p className={LABEL_CLASS}>Or pick from the project list</p>
        <ProjectPickerTable selectedProjectId={selectedProjectId} onSelect={onSelectFromTable} />
      </div>
    </FormSection>
  );
}
