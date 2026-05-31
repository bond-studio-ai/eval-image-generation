"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { serviceUrl } from "@/lib/api-base";
import { logger } from "@/lib/logger";

const options = [
  { value: "GOOD", label: "Good", color: "bg-success-100 text-success-700 hover:bg-success-200" },
  { value: "FAILED", label: "Failed", color: "bg-warning-100 text-warning-700 hover:bg-warning-200" }
];

interface RatingFormProps {
  generationId: string;
  currentSceneAccuracyRating: string | null;
  currentProductAccuracyRating: string | null;
  /** When provided (e.g. in a modal), called after rating is saved instead of router.refresh(). */
  onRated?: () => void;
}

function RatingRow({ label, current, onRate, disabled }: { label: string; current: string | null; onRate: (value: string) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-text-secondary text-body w-36 shrink-0 font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const activeClass = current === option.value ? `${option.color} ring-2 ring-current ring-offset-1` : option.color;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onRate(option.value);
              }}
              disabled={disabled}
              className={`text-body rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeClass}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RatingForm({ generationId, currentSceneAccuracyRating, currentProductAccuracyRating, onRated }: RatingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRate(payload: Record<string, string>) {
    setLoading(true);
    try {
      await fetch(serviceUrl(`generations/${generationId}/rating`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (onRated) onRated();
      else router.refresh();
    } catch (error) {
      logger.error("Failed to rate:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <RatingRow label="Scene Accuracy" current={currentSceneAccuracyRating} onRate={(rating) => handleRate({ sceneAccuracyRating: rating })} disabled={loading} />
      <RatingRow label="Product Accuracy" current={currentProductAccuracyRating} onRate={(rating) => handleRate({ productAccuracyRating: rating })} disabled={loading} />
    </div>
  );
}
