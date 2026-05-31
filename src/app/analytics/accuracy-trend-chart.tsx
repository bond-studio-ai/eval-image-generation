"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { browserTimezone, serviceUrl } from "@/lib/api-base";
import { fetchJson } from "@/lib/api/client";
import { accuracyTrendsResponseSchema } from "@/lib/api/schemas";
import type { AccuracyTrendPoint } from "@/lib/service-client";

const AccuracyTrendChartGraph = dynamic(() => import("./accuracy-trend-chart-graph").then((module) => module.AccuracyTrendChartGraph), { ssr: false });

interface AccuracyTrendChartProps {
  from?: string;
  to?: string;
  model?: string;
  source?: string;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${Number(parts[1])}/${Number(parts[2])}`;
  const date = new Date(dateStr);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
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
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (model) params.set("model", model);
      if (source && source !== "all") params.set("source", source);
      const tz = browserTimezone();
      if (tz) params.set("tz", tz);
      const qs = params.toString();
      const json = await fetchJson(serviceUrl(`analytics/accuracy-trends${qs ? `?${qs}` : ""}`), accuracyTrendsResponseSchema, { cache: "no-store" });
      setData(json.data?.trends ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [from, to, model, source]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center justify-center py-12">
        <div className="border-t-primary-600 border-border-strong size-8 animate-spin rounded-full border-4" />
      </div>
    );
  }

  if (error) {
    return <div className="border-border bg-surface text-text-muted text-body mt-6 rounded-lg border p-6 text-center">Failed to load accuracy trend data.</div>;
  }

  if (data.length === 0) {
    return <div className="border-border bg-surface text-text-muted text-body mt-6 rounded-lg border p-6 text-center">No accuracy trend data available for this period.</div>;
  }

  const chartData = data.map((point) => ({
    ...point,
    label: formatDate(point.date)
  }));

  return (
    <div className="border-border bg-surface mt-6 rounded-lg border p-6 shadow-xs">
      <h2 className="text-text-primary text-h3">Accuracy Over Time</h2>
      <p className="text-text-secondary text-body mt-1">Daily scene and product accuracy percentages based on evaluation ratings.</p>
      <div className="mt-4" style={{ width: "100%", height: 360 }}>
        <AccuracyTrendChartGraph chartData={chartData} />
      </div>
    </div>
  );
}
