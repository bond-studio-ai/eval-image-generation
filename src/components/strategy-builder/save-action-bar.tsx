'use client';

export function SaveActionBar({
  onSave,
  disabled,
  saving,
  isEditing,
}: {
  onSave: () => void;
  disabled: boolean;
  saving: boolean;
  isEditing: boolean;
}) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
      >
        {saving ? (
          <>
            <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Saving…
          </>
        ) : isEditing ? (
          'Update Strategy'
        ) : (
          'Create Strategy'
        )}
      </button>
    </div>
  );
}
