import { ExpandableImage } from "@/components/expandable-image";
import { ImageEvaluationForm } from "@/components/image-evaluation-form";
import type { ResultImage } from "./types";

export function OutputImagesSection({ results, activeProductCategories }: { results: ResultImage[]; activeProductCategories: string[] }) {
  return (
    <div id="section-output" className="mt-8 scroll-mt-6">
      <h2 className="text-text-primary text-h3">Output Images</h2>
      {results.length === 0 ? (
        <p className="text-text-secondary text-body mt-4">No output images for this generation.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {results.map((img, idx) => (
            <div key={img.id} className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Image */}
                <div className="bg-surface-muted">
                  <ExpandableImage src={img.url} alt={`Output image ${idx + 1}`} wrapperClassName="relative block h-80 min-h-[20rem] w-full bg-surface-muted" />
                  <div className="border-border border-t p-2">
                    <p className="text-text-secondary text-caption min-w-0 truncate">{img.url}</p>
                  </div>
                </div>

                {/* Evaluation Form */}
                <div className="border-border border-t p-4 lg:border-t-0 lg:border-l">
                  <ImageEvaluationForm resultId={img.id} productCategories={activeProductCategories} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
