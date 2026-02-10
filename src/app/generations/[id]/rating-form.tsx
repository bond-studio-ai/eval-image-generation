'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const options = [
  { value: 'GOOD', label: 'Good', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'FAILED', label: 'Failed', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
];

interface RatingFormProps {
  generationId: string;
  currentSceneAccuracyRating: string | null;
  currentProductAccuracyRating: string | null;
}

function RatingRow({
  label,
  current,
  onRate,
  disabled,
}: {
  label: string;
  current: string | null;
  onRate: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 shrink-0 text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((r) => (
          <button
            key={r.value}
            onClick={() => onRate(r.value)}
            disabled={disabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              current === r.value ? `${r.color} ring-2 ring-current ring-offset-1` : r.color
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RatingForm({
  generationId,
  currentSceneAccuracyRating,
  currentProductAccuracyRating,
}: RatingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRate(payload: Record<string, string>) {
    setLoading(true);
    try {
      await fetch(`/api/v1/generations/${generationId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to rate:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <RatingRow
        label="Scene Accuracy"
        current={currentSceneAccuracyRating}
        onRate={(v) => handleRate({ scene_accuracy_rating: v })}
        disabled={loading}
      />
      <RatingRow
        label="Product Accuracy"
        current={currentProductAccuracyRating}
        onRate={(v) => handleRate({ product_accuracy_rating: v })}
        disabled={loading}
      />
    </div>
  );
}
