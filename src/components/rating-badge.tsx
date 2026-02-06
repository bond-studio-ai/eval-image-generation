const ratingConfig: Record<string, { label: string; className: string }> = {
  EXCELLENT: {
    label: 'Excellent',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  GOOD: {
    label: 'Good',
    className: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  ACCEPTABLE: {
    label: 'Acceptable',
    className: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  },
  POOR: {
    label: 'Poor',
    className: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-50 text-red-700 ring-red-600/20',
  },
};

export function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-500/10 ring-inset">
        Unrated
      </span>
    );
  }

  const config = ratingConfig[rating];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
