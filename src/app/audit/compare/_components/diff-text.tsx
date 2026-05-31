import { type Change, diffWords } from "diff";

export function DiffText({ left, right }: { left: string; right: string }) {
  if (left === right) {
    return <pre className="border-border bg-surface-muted text-text-secondary text-caption max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">{left}</pre>;
  }

  const changes: Change[] = diffWords(left, right);

  return (
    <div className="grid grid-cols-2 gap-2">
      <pre className="text-text-primary border-danger-200 bg-danger-50/30 text-caption max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">
        {changes.map((change, i) =>
          change.added ? null : (
            <span key={i} className={change.removed ? "bg-danger-200 text-danger-900" : ""}>
              {change.value}
            </span>
          )
        )}
      </pre>
      <pre className="text-text-primary border-success-200 bg-success-50/30 text-caption max-h-64 overflow-auto rounded-md border p-2 leading-relaxed whitespace-pre-wrap">
        {changes.map((change, i) =>
          change.removed ? null : (
            <span key={i} className={change.added ? "bg-success-200 text-success-900" : ""}>
              {change.value}
            </span>
          )
        )}
      </pre>
    </div>
  );
}
