"use client";

import { Badge } from "@/components/ui/badge";

const REVIEW_STATUS_CONFIG: Record<string, { tone: "info" | "neutral" | "warning" | "success"; label: string }> = {
  running: { tone: "info", label: "Running" },
  pending: { tone: "neutral", label: "Pending" },
  in_progress: { tone: "warning", label: "In Progress" },
  reviewed: { tone: "success", label: "Reviewed" }
};

export function ReviewStatusBadge({ status }: { status: string }) {
  const config = REVIEW_STATUS_CONFIG[status] ?? REVIEW_STATUS_CONFIG["pending"]!;
  return (
    <Badge tone={config.tone} variant="soft">
      {config.label}
    </Badge>
  );
}
