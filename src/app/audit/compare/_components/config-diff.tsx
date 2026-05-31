import { coerceString } from "@/lib/coerce-string";

const CONFIG_LABELS: Record<string, string> = {
  model: "Model",
  aspect_ratio: "Aspect Ratio",
  output_resolution: "Resolution",
  temperature: "Temperature",
  use_google_search: "Google Search",
  tag_images: "Tag Images"
};

export function ConfigDiff({ left, right }: { left: Record<string, unknown> | null; right: Record<string, unknown> | null }) {
  const allKeys = Array.from(new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]));
  if (allKeys.length === 0) return <p className="text-text-disabled text-caption">No config data</p>;

  return (
    <div className="space-y-1">
      {allKeys.map((key) => {
        const lv = coerceString(left?.[key]) ?? "";
        const rv = coerceString(right?.[key]) ?? "";
        const changed = lv !== rv;
        return (
          <div key={key} className={`flex items-center gap-2 rounded px-2 py-0.5 text-[11px] ${changed ? "bg-warning-50 ring-warning-200 ring-1" : "bg-surface-muted"}`}>
            <span className="text-text-muted w-28 shrink-0 font-medium">{CONFIG_LABELS[key] ?? key}</span>
            {changed ? (
              <>
                <span className="bg-danger-100 text-danger-700 rounded px-1 line-through">{lv || "(none)"}</span>
                <span className="text-text-disabled">&rarr;</span>
                <span className="bg-success-100 text-success-700 rounded px-1">{rv || "(none)"}</span>
              </>
            ) : (
              <span className="text-text-secondary">{lv}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
