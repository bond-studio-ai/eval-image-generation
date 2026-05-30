import { AlertCircleIcon } from "@/components/ui/icons";

const MAX_VISIBLE_ERRORS = 5;

export function TemplateErrors({ errors }: { errors: { line: number; message: string }[] }) {
  if (errors.length === 0) return null;

  const visible = errors.slice(0, MAX_VISIBLE_ERRORS);
  const remaining = errors.length - visible.length;

  return (
    <div className="bg-danger-50 mt-1.5 shrink-0 rounded-md px-3 py-2">
      <div className="space-y-0.5">
        {visible.map((err) => (
          <p key={`${err.line}:${err.message}`} className="text-danger-700 text-caption flex items-start gap-1.5">
            <AlertCircleIcon className="text-danger-500 mt-0.5 size-3 shrink-0" />
            <span>
              <span className="font-semibold">Line {err.line}:</span> {err.message}
            </span>
          </p>
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-danger-500 mt-1 text-[10px]">
          and {remaining} more {remaining === 1 ? "error" : "errors"}
        </p>
      )}
    </div>
  );
}
