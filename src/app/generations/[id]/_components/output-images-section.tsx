import { ExpandableImage } from "@/components/expandable-image";
import { ImageEvaluationForm } from "@/components/image-evaluation-form";
import type { ResultImage } from "./types";

export function OutputImagesSection({ results, activeProductCategories }: { results: ResultImage[]; activeProductCategories: string[] }) {
  return (
    <div id="section-output" className="mt-8 scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Output Images</h2>
      {results.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">No output images for this generation.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {results.map((img, idx) => (
            <div key={img.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Image */}
                <div className="bg-gray-50">
                  <ExpandableImage src={img.url} alt={`Output image ${idx + 1}`} wrapperClassName="relative block h-80 min-h-[20rem] w-full bg-gray-50" />
                  <div className="border-t border-gray-200 p-2">
                    <p className="min-w-0 truncate text-xs text-gray-600">{img.url}</p>
                  </div>
                </div>

                {/* Evaluation Form */}
                <div className="border-t border-gray-200 p-4 lg:border-t-0 lg:border-l">
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
