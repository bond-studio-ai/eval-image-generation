'use client';

import { ErrorCard } from '@/components/resource-form-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { FormSection } from '@/components/ui/form-section';
import { CheckCircleIcon } from '@/components/ui/icons';
import type { ProjectRenderBootstrap } from '@/lib/projects';
import { ProjectPickerList } from '../project-picker-list';

const LABEL_CLASS =
  'text-caption text-text-secondary mb-2 block font-medium uppercase tracking-wide';

interface ProjectPickerSectionProps {
  projectIdInput: string;
  onProjectIdInputChange: (value: string) => void;
  onLoadManualInput: () => void;
  onSelectFromTable: (projectId: string) => void;
  loadingProject: boolean;
  projectError: string | null;
  selectedBootstrap: ProjectRenderBootstrap | null;
  onClearProject: () => void;
}

export function ProjectPickerSection({
  projectIdInput,
  onProjectIdInputChange,
  onLoadManualInput,
  onSelectFromTable,
  loadingProject,
  projectError,
  selectedBootstrap,
  onClearProject,
}: ProjectPickerSectionProps) {
  return (
    <FormSection
      title="Project"
      description="Pick a project from the list, or paste a project ID to load it directly."
    >
      {selectedBootstrap && (
        <div className="mb-4">
          <SelectedProjectBanner bootstrap={selectedBootstrap} onClear={onClearProject} />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label="Project ID"
            hint={
              selectedBootstrap
                ? undefined
                : 'Paste an ID and click Load, or pick from the list below.'
            }
          >
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
          Load project
        </Button>
      </div>

      {projectError && (
        <div className="mt-4">
          <ErrorCard message={projectError} />
        </div>
      )}

      <div className="mt-6">
        <p className={LABEL_CLASS}>Or pick from the project list</p>
        <ProjectPickerList
          selectedProjectId={selectedBootstrap?.project.id ?? null}
          onSelect={onSelectFromTable}
        />
      </div>
    </FormSection>
  );
}

function SelectedProjectBanner({
  bootstrap,
  onClear,
}: {
  bootstrap: ProjectRenderBootstrap;
  onClear: () => void;
}) {
  const { project, cameraFrames, designMaterials, roomData } = bootstrap;
  const summary = [
    `${cameraFrames.length} camera frame${cameraFrames.length === 1 ? '' : 's'}`,
    designMaterials ? 'design materials loaded' : 'no design materials',
    roomData ? 'room data loaded' : 'no room data',
  ].join(' · ');
  return (
    <Banner
      tone="success"
      icon={<CheckCircleIcon className="size-5" aria-hidden />}
      title={`Selected project ${project.id}`}
      description={`${project.name ? `${project.name} · ` : ''}${summary}`}
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Change project
        </Button>
      }
    />
  );
}
