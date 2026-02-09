'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ratings = [
  { value: 'GOOD', label: 'Good', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'FAILED', label: 'Failed', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
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
