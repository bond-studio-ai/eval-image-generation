import { ImageWithSkeleton } from "@/components/image-with-skeleton";

export function SceneImagesSection({ dollhouseView, realPhoto, moodBoard }: { dollhouseView: string | undefined; realPhoto: string | undefined; moodBoard: string | undefined }) {
  if (!(dollhouseView || realPhoto || moodBoard)) return null;

  return (
    <div id="section-scene" className="mt-8 scroll-mt-6">
      <h2 className="text-text-primary text-h3">Scene Images</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {dollhouseView && (
          <div className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
            <ImageWithSkeleton src={dollhouseView as string} alt="Dollhouse View" wrapperClassName="h-56 w-full bg-surface-muted" />
            <div className="p-2">
              <p className="text-text-secondary text-caption font-medium">Dollhouse View</p>
            </div>
          </div>
        )}
        {realPhoto && (
          <div className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
            <ImageWithSkeleton src={realPhoto as string} alt="Real Photo" wrapperClassName="h-56 w-full bg-surface-muted" />
            <div className="p-2">
              <p className="text-text-secondary text-caption font-medium">Real Photo</p>
            </div>
          </div>
        )}
        {moodBoard && (
          <div className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
            <ImageWithSkeleton src={moodBoard as string} alt="Mood Board" wrapperClassName="h-56 w-full bg-surface-muted" />
            <div className="p-2">
              <p className="text-text-secondary text-caption font-medium">Mood Board</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
