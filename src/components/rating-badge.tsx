const ratingConfig: Record<string, { label: string; className: string }> = {
  GOOD: {
    label: "Good",
    className: "bg-success-50 text-success-700 ring-success-600/20"
  },
  FAILED: {
    label: "Failed",
    className: "bg-warning-50 text-warning-700 ring-warning-600/20"
  }
};

export function RatingBadge({ rating, label }: { rating: string | null; label?: string }) {
  if (!rating) {
    return <span className="bg-surface-muted text-text-secondary ring-text-muted/10 text-caption inline-flex items-center rounded-full px-2 py-1 font-medium ring-1 ring-inset">{label ? `${label}: Unrated` : "Unrated"}</span>;
  }

  const config = ratingConfig[rating];
  if (!config) return null;

  return <span className={`text-caption inline-flex items-center rounded-full px-2 py-1 font-medium ring-1 ring-inset ${config.className}`}>{label ? `${label}: ${config.label}` : config.label}</span>;
}
