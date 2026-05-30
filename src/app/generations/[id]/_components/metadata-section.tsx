export function MetadataSection({ createdAt, executionTime, resultCount, notes }: { createdAt: string; executionTime: number | null; resultCount: number; notes: string | null }) {
  return (
    <>
      {/* Meta */}
      <div id="section-meta" className="mt-8 grid scroll-mt-6 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-caption font-medium">Created</p>
          <p className="text-text-primary text-body mt-1 font-medium">{new Date(createdAt).toLocaleString()}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-caption font-medium">Execution Time</p>
          <p className="text-text-primary text-body mt-1 font-medium">{executionTime ? `${(executionTime / 1000).toFixed(1)}s` : "Not recorded"}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-caption font-medium">Results</p>
          <p className="text-text-primary text-body mt-1 font-medium">
            {resultCount} output image{resultCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div id="section-notes" className="border-border bg-surface mt-6 scroll-mt-6 rounded-lg border p-6 shadow-xs">
          <h2 className="text-text-primary text-body font-semibold uppercase">Notes</h2>
          <p className="text-text-secondary text-body mt-2">{notes}</p>
        </div>
      )}
    </>
  );
}
