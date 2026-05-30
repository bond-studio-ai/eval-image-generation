import { AlertCircleIcon } from "@/components/ui/icons";

interface ResourceFormHeaderProps {
  name: string;
  onNameChange: (value: string) => void;
  namePlaceholder?: string;
  nameRequired?: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder?: string;
}

export function ResourceFormHeader({ name, onNameChange, namePlaceholder = "Untitled", nameRequired = true, description, onDescriptionChange, descriptionPlaceholder = "Optional description..." }: ResourceFormHeaderProps) {
  return (
    <div className="rounded-card border-border bg-surface shadow-card border p-5">
      <div className="space-y-4">
        <div>
          <label htmlFor="resource-form-name" className="text-body text-text-primary mb-1 block font-medium">
            Name {nameRequired && <span className="text-danger-500">*</span>}
          </label>
          <input
            id="resource-form-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
            className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 w-full border px-3 py-2 focus:ring-1 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="resource-form-description" className="text-body text-text-primary mb-1 block font-medium">
            Description
          </label>
          <textarea
            id="resource-form-description"
            rows={2}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={descriptionPlaceholder}
            className="rounded-input border-border-strong bg-surface text-body focus:border-primary-500 focus:ring-primary-500 w-full border px-3 py-2 focus:ring-1 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-card border-danger-200 bg-danger-50 flex items-start gap-3 border p-4">
      <AlertCircleIcon className="text-danger-600 mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-body text-danger-700">{message}</p>
    </div>
  );
}
