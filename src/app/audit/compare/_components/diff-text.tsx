import { diffWords, type Change } from "diff";

export function DiffText({ left, right }: { left: string; right: string }) {
  if (left === right) {
    return <pre className="max-h-64 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-2 text-xs leading-relaxed whitespace-pre-wrap text-gray-700">{left}</pre>;
  }

  const changes: Change[] = diffWords(left, right);

  return (
    <div className="grid grid-cols-2 gap-2">
      <pre className="text-text-primary max-h-64 overflow-auto rounded-md border border-red-200 bg-red-50/30 p-2 text-xs leading-relaxed whitespace-pre-wrap">
        {changes.map((c, i) =>
          c.added ? null : (
            <span key={i} className={c.removed ? "bg-red-200 text-red-900" : ""}>
              {c.value}
            </span>
          )
        )}
      </pre>
      <pre className="text-text-primary max-h-64 overflow-auto rounded-md border border-green-200 bg-green-50/30 p-2 text-xs leading-relaxed whitespace-pre-wrap">
        {changes.map((c, i) =>
          c.removed ? null : (
            <span key={i} className={c.added ? "bg-green-200 text-green-900" : ""}>
              {c.value}
            </span>
          )
        )}
      </pre>
    </div>
  );
}
