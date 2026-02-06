'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ratings = [
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'POOR', label: 'Poor', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  {
    value: 'ACCEPTABLE',
    label: 'Acceptable',
    color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  {
    value: 'EXCELLENT',
    label: 'Excellent',
    color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  },
];

interface RatingFormProps {
  generationId: string;
  currentRating: string | null;
}

export function RatingForm({ generationId, currentRating }: RatingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRate(rating: string) {
    setLoading(true);
    try {
      await fetch(`/api/v1/generations/${generationId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to rate:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ratings.map((r) => (
        <button
          key={r.value}
          onClick={() => handleRate(r.value)}
          disabled={loading}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            currentRating === r.value ? `${r.color} ring-2 ring-current ring-offset-1` : r.color
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
