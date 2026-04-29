import { CalibrationStatusBadge, formatDateTime } from '@/components/catalog-confidence/badges';
import { PageHeader } from '@/components/page-header';
import { fetchAdminCalibrations } from '@/lib/catalog-feed-client';
import { RecomputeButton } from './recompute-button';

export const dynamic = 'force-dynamic';

export default async function CatalogCalibrationsPage() {
  let rows: Awaited<ReturnType<typeof fetchAdminCalibrations>> = [];
  let error: string | null = null;
  try {
    rows = await fetchAdminCalibrations();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div>
      <PageHeader
        title="Catalog Confidence — Calibrations"
        subtitle="Nightly isotonic-regression models that map raw signal aggregates to calibrated [0,1] confidence. Recompute triggers the same job on demand against the last 30 days of human reviews."
        actions={<RecomputeButton />}
      />

      {error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load calibrations: {error}
        </div>
      )}

      <div className="mt-6 overflow-clip rounded-lg border border-gray-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Scope
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Kind
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Training set
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Brier
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                MAE
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Valid from
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                Valid to
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No calibration models recorded yet. Trigger a recompute once there are human
                  reviews.
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">{c.scope}</td>
                <td className="px-4 py-2 text-sm text-gray-700">{c.kind}</td>
                <td className="px-4 py-2">
                  <CalibrationStatusBadge status={c.status} />
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                  {c.trainingSetSize}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                  {c.brier != null ? c.brier.toFixed(4) : '—'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700 tabular-nums">
                  {c.mae != null ? c.mae.toFixed(4) : '—'}
                </td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatDateTime(c.validFrom)}</td>
                <td className="px-4 py-2 text-xs text-gray-700">{formatDateTime(c.validTo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Brier and MAE are computed against the same labeled set used to fit the isotonic curve. A
        rising Brier or MAE over time is the cleanest signal that the scoring distribution has
        drifted and a prompt/model change may have regressed calibration.
      </p>
    </div>
  );
}
