'use client';

import type { RoutingThreshold } from '@/lib/catalog-feed-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  initial: RoutingThreshold;
}

/**
 * ThresholdEditor drives PUT /admin/thresholds/{scope}. The form
 * mirrors the upstream validation (autoShipMin > holdMax, both in
 * [0,1]) so the reviewer gets feedback before the request leaves the
 * browser; the server still enforces the invariants authoritatively.
 */
export function ThresholdEditor({ initial }: Props) {
  const router = useRouter();
  const [autoShipMin, setAutoShipMin] = useState<number>(initial.autoShipMin);
  const [holdMax, setHoldMax] = useState<number>(initial.holdMax);
  const [sampleRate, setSampleRate] = useState<number>(initial.spotCheckSampleRate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const clientError =
    autoShipMin <= holdMax
      ? 'autoShipMin must be > holdMax'
      : autoShipMin < 0 || autoShipMin > 1
        ? 'autoShipMin must be in [0, 1]'
        : holdMax < 0 || holdMax > 1
          ? 'holdMax must be in [0, 1]'
          : sampleRate < 0 || sampleRate > 1
            ? 'spotCheckSampleRate must be in [0, 1]'
            : null;

  const save = async () => {
    if (clientError) {
      setError(clientError);
      return;
    }
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(
        `/api/v1/catalog-feed/admin/thresholds/${encodeURIComponent(initial.scope)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            autoShipMin,
            holdMax,
            spotCheckSampleRate: sampleRate,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      setOk(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Scope · <span className="font-mono text-gray-900 normal-case">{initial.scope}</span>
        </h2>
        {initial.updatedAt && (
          <span className="text-xs text-gray-500">
            Last updated {new Date(initial.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <NumberField
          label="Auto-ship min"
          helper="Calibrated score at or above this lands in the auto-ship lane."
          value={autoShipMin}
          onChange={setAutoShipMin}
        />
        <NumberField
          label="Hold max"
          helper="Calibrated score at or below this is held for reviewer."
          value={holdMax}
          onChange={setHoldMax}
        />
        <NumberField
          label="Spot-check sample rate"
          helper="Fraction of auto-shipped rows re-surfaced for spot-check."
          value={sampleRate}
          onChange={setSampleRate}
        />
      </div>

      <LaneDiagram autoShipMin={autoShipMin} holdMax={holdMax} />

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !!clientError}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
        >
          {saving ? 'Saving…' : 'Save thresholds'}
        </button>
        {clientError && <span className="text-xs text-red-700">{clientError}</span>}
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}
      {ok && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800">
          Thresholds saved. Running workers will pick up the new routing on the next call.
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label}
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number.parseFloat(e.target.value) || 0)}
        className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm text-gray-900 tabular-nums shadow-xs"
      />
      <span className="mt-1 block text-[11px] font-normal text-gray-500 normal-case">{helper}</span>
    </label>
  );
}

function LaneDiagram({ autoShipMin, holdMax }: { autoShipMin: number; holdMax: number }) {
  const safeAuto = Math.max(0, Math.min(1, autoShipMin));
  const safeHold = Math.max(0, Math.min(1, holdMax));
  const holdPct = Math.round(safeHold * 100);
  const spotPct = Math.round((safeAuto - safeHold) * 100);
  const autoPct = Math.round((1 - safeAuto) * 100);
  return (
    <div className="mt-6">
      <div className="text-xs font-medium tracking-wide text-gray-600 uppercase">Lane layout</div>
      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full border border-gray-200">
        <div className="bg-red-500" style={{ width: `${holdPct}%` }} />
        <div className="bg-yellow-400" style={{ width: `${Math.max(0, spotPct)}%` }} />
        <div className="bg-green-500" style={{ width: `${autoPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-500">
        <span>0.00</span>
        <span>hold ≤ {safeHold.toFixed(2)}</span>
        <span>auto ≥ {safeAuto.toFixed(2)}</span>
        <span>1.00</span>
      </div>
    </div>
  );
}
