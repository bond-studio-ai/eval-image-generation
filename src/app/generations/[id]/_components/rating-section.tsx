import { RatingForm } from "../rating-form";

export function RatingSection({ generationId, sceneAccuracyRating, productAccuracyRating }: { generationId: string; sceneAccuracyRating: string | null; productAccuracyRating: string | null }) {
  return (
    <div id="section-rating" className="border-border bg-surface mt-6 scroll-mt-6 rounded-lg border p-6 shadow-xs">
      <h2 className="text-text-primary text-body font-semibold uppercase">Rate this Generation</h2>
      <div className="mt-3">
        <RatingForm generationId={generationId} currentSceneAccuracyRating={sceneAccuracyRating} currentProductAccuracyRating={productAccuracyRating} />
      </div>
    </div>
  );
}
