const CONFIG_LABELS: Record<string, string> = {
  model: "Model",
  aspect_ratio: "Aspect Ratio",
  output_resolution: "Resolution",
  temperature: "Temperature",
  use_google_search: "Google Search",
  tag_images: "Tag Images"
};

export function ConfigDiff({ left, right }: { left: Record<string, unknown> | null; right: Record<string, unknown> | null }) {
  const allKeys = [...new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})])];
  if (allKeys.length === 0) return <p className="text-xs text-gray-400">No config data</p>;

  return (
    <div className="space-y-1">
      {allKeys.map((key) => {
        const lv = String((left ?? {})[key] ?? "");
        const rv = String((right ?? {})[key] ?? "");
        const changed = lv !== rv;
        return (
          <div key={key} className={`flex items-center gap-2 rounded px-2 py-0.5 text-[11px] ${changed ? "bg-amber-50 ring-1 ring-amber-200" : "bg-gray-50"}`}>
            <span className="w-28 shrink-0 font-medium text-gray-500">{CONFIG_LABELS[key] ?? key}</span>
            {changed ? (
              <>
                <span className="rounded bg-red-100 px-1 text-red-700 line-through">{lv || "(none)"}</span>
                <span className="text-gray-400">&rarr;</span>
                <span className="rounded bg-green-100 px-1 text-green-700">{rv || "(none)"}</span>
              </>
            ) : (
              <span className="text-gray-700">{lv}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
