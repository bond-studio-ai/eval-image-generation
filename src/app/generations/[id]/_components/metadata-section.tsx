export function MetadataSection({ createdAt, executionTime, resultCount, notes }: { createdAt: string; executionTime: number | null; resultCount: number; notes: string | null }) {
  return (
    <>
      {/* Meta */}
      <div id="section-meta" className="mt-8 grid scroll-mt-6 grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Created</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{new Date(createdAt).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Execution Time</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{executionTime ? `${(executionTime / 1000).toFixed(1)}s` : "Not recorded"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-gray-600">Results</p>
          <p className="mt-1 text-sm font-medium text-gray-900">
            {resultCount} output image{resultCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div id="section-notes" className="mt-6 scroll-mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">Notes</h2>
          <p className="mt-2 text-sm text-gray-700">{notes}</p>
        </div>
      )}
    </>
  );
}
