import { CodeIcon, FileTextIcon, GridIcon, ImageIcon, InfoIcon, StarIcon } from "@/components/ui/icons";
import type { NavSection } from "./types";

/** Builds the in-page navigation sections, including the conditional ones. */
export function buildNavSections({ hasNotes, hasSceneImages, hasProductImages }: { hasNotes: boolean; hasSceneImages: boolean; hasProductImages: boolean }): NavSection[] {
  return [
    {
      id: "section-rating",
      label: "Rating",
      icon: <StarIcon className="size-4" />
    },
    {
      id: "section-output",
      label: "Output Images",
      icon: <ImageIcon className="size-4" />
    },
    {
      id: "section-meta",
      label: "Info",
      icon: <InfoIcon className="size-4" />
    },
    ...(hasNotes
      ? [
          {
            id: "section-notes",
            label: "Notes",
            icon: <FileTextIcon className="size-4" />
          }
        ]
      : []),
    ...(hasSceneImages
      ? [
          {
            id: "section-scene",
            label: "Scene Images",
            icon: <ImageIcon className="size-4" />
          }
        ]
      : []),
    ...(hasProductImages
      ? [
          {
            id: "section-products",
            label: "Product Images",
            icon: <GridIcon className="size-4" />
          }
        ]
      : []),
    {
      id: "section-prompts",
      label: "Prompts",
      icon: <CodeIcon className="size-4" />
    }
  ];
}
