interface ResourceFormHeaderProps {
  name: string;
  onNameChange: (value: string) => void;
  namePlaceholder?: string;
  nameRequired?: boolean;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder?: string;
}

export function ResourceFormHeader({
  name,
  onNameChange,
  namePlaceholder = 'Untitled',
  nameRequired = true,
  description,
  onDescriptionChange,
  descriptionPlaceholder = 'Optional description...',
}: ResourceFormHeaderProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Name {nameRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={descriptionPlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          />
        </div>
      </div>
    </div>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}
