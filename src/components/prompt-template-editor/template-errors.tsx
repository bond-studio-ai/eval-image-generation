const MAX_VISIBLE_ERRORS = 5;

export function TemplateErrors({ errors }: { errors: { line: number; message: string }[] }) {
  if (errors.length === 0) return null;

  const visible = errors.slice(0, MAX_VISIBLE_ERRORS);
  const remaining = errors.length - visible.length;

  return (
    <div className="mt-1.5 shrink-0 rounded-md bg-red-50 px-3 py-2">
      <div className="space-y-0.5">
        {visible.map((err) => (
          <p
            key={`${err.line}:${err.message}`}
            className="flex items-start gap-1.5 text-xs text-red-700"
          >
            <svg
              className="mt-0.5 size-3 shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <span className="font-semibold">Line {err.line}:</span> {err.message}
            </span>
          </p>
        ))}
      </div>
      {remaining > 0 && (
        <p className="mt-1 text-[10px] text-red-500">
          and {remaining} more {remaining === 1 ? 'error' : 'errors'}
        </p>
      )}
    </div>
  );
}
