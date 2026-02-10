const ratingConfig: Record<string, { label: string; className: string }> = {
  GOOD: {
    label: 'Good',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
};

export function RatingBadge({ rating, label }: { rating: string | null; label?: string }) {
  if (!rating) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset">
        {label ? `${label}: Unrated` : 'Unrated'}
      </span>
    );
  }

  const config = ratingConfig[rating];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {label ? `${label}: ${config.label}` : config.label}
    </span>
  );
}
