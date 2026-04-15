'use client';

import { browserTimezone, serviceUrl } from '@/lib/api-base';
import type { AccuracyTrendPoint } from '@/lib/service-client';
import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AccuracyTrendChartProps {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${Number(parts[1])}/${Number(parts[2])}`;
  const d = new Date(dateStr);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export function AccuracyTrendChart({ from, to, model, source }: AccuracyTrendChartProps) {
  const [data, setData] = useState<AccuracyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (model) params.set('model', model);
      if (source && source !== 'all') params.set('source', source);
      const tz = browserTimezone();
      if (tz) params.set('tz', tz);
      const qs = params.toString();
      const res = await fetch(serviceUrl(`analytics/accuracy-trends${qs ? `?${qs}` : ''}`), {
        cache: 'no-store',
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      const json = await res.json();
      const trends = json.data?.trends;
      setData(Array.isArray(trends) ? trends : []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [from, to, model, source]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        Failed to load accuracy trend data.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No accuracy trend data available for this period.
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-semibold text-gray-900">Accuracy Over Time</h2>
      <p className="mt-1 text-sm text-gray-600">
        Daily scene and product accuracy percentages based on evaluation ratings.
      </p>
      <div className="mt-4" style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const n = Number(value);
                return [Number.isFinite(n) ? `${n.toFixed(1)}%` : 'N/A', String(name)];
              }}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as { date?: string } | undefined;
                if (!point?.date) return String(_label);
                const [y, m, d] = point.date.split('-');
                if (y && m && d) {
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
                }
                return String(_label);
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '13px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }} />
            <Line
              type="monotone"
              dataKey="sceneAccuracy"
              name="Scene Accuracy"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="productAccuracy"
              name="Product Accuracy"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
