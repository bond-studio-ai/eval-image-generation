import type { StrategyModelCatalog } from "@/lib/service-client";
import type { InputPresetListItem, PromptVersionListItem } from "@/lib/types";

export type ProductImageType = "featured-image" | "photo-image" | "line-drawing" | "tear-sheet";

export interface StepData {
  id?: string;
  /** Stable client-only key for React list rendering (never sent to the API). */
  _uid?: string;
  type: "generation" | "judge";
  number_of_images?: number;
  name: string;
  prompt_version_id: string;
  model: string;
  aspect_ratio: string;
  output_resolution: string;
  temperature: number;
  use_google_search: boolean;
  tag_images: boolean;
  dollhouse_view_from_step: number | null;
  real_photo_from_step: number | null;
  mood_board_from_step: number | null;
  include_dollhouse: boolean;
  include_real_photo: boolean;
  include_mood_board: boolean;
  include_product_images: boolean;
  include_product_categories: string[];
  product_image_types: Record<string, ProductImageType>;
  arbitrary_image_from_step: number | null;
  judges?: JudgeData[];
}

export interface StrategySettings {
  model: string;
  aspect_ratio: string;
  output_resolution: string;
  temperature: number;
  use_google_search: boolean;
  tag_images: boolean;
  group_product_images: boolean;
  /** Maps to API checkSceneAccuracy / DB check_scene_accuracy */
  check_scene_accuracy: boolean;
  /** Maps to API enableMultiTurnContext / DB enable_multi_turn_context */
  enable_multi_turn_context: boolean;
}

export interface JudgeData {
  id?: string;
  /** Stable client-only key for React list rendering (never sent to the API). */
  _uid?: string;
  name?: string;
  judge_model: string;
  judge_type: "batch" | "individual";
  judge_prompt_version_id: string;
  tolerance_threshold: number;
}

export interface PreviewSettings {
  preview_model: string | null;
  preview_resolution: string;
}

export interface StrategyBuilderProps {
  strategyId?: string;
  initialName?: string;
  initialDescription?: string;
  initialStrategySettings?: StrategySettings;
  initialPreviewSettings?: PreviewSettings;
  initialSteps?: StepData[];
  initialJudges?: JudgeData[];
  promptVersions: PromptVersionListItem[];
  inputPresets: InputPresetListItem[];
  modelCatalog: StrategyModelCatalog;
}

export interface ModelOption {
  label: string;
  meta?: string;
  value: string;
}

export const PRODUCT_CATEGORIES = [
  "faucets",
  "floor_tiles",
  "lightings",
  "lvps",
  "mirrors",
  "paints",
  "robe_hooks",
  "shelves",
  "shower_curb_tiles",
  "shower_floor_tiles",
  "shower_glasses",
  "shower_systems",
  "shower_wall_tiles",
  "toilet_paper_holders",
  "toilets",
  "towel_bars",
  "towel_rings",
  "tub_doors",
  "tub_fillers",
  "tubs",
  "vanities",
  "wall_tiles",
  "wallpapers"
] as const;

export const IMAGE_TYPE_OPTIONS: { value: ProductImageType; label: string }[] = [
  { value: "featured-image", label: "Featured" },
  { value: "photo-image", label: "Photo Image" },
  { value: "tear-sheet", label: "Tear Sheet" },
  { value: "line-drawing", label: "Line Drawing" }
];

export function categoryLabel(cat: string): string {
  return cat.replaceAll("_", " ").replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

export const FALLBACK_GENERATION_MODEL = "gemini-3-pro-image-preview";
export const FALLBACK_JUDGE_MODEL = "gemini-2.5-flash";
export const FALLBACK_PREVIEW_MODEL = "gemini-3.1-flash-image-preview";

let uidSeq = 0;
/** Generates a stable client-only id for keying steps/judges in React lists. */
export function nextUid(): string {
  uidSeq += 1;
  return `sb-${uidSeq}`;
}

export function defaultStep(promptVersionId: string, model = FALLBACK_GENERATION_MODEL): StepData {
  return {
    _uid: nextUid(),
    type: "generation",
    name: "",
    prompt_version_id: promptVersionId,
    model,
    aspect_ratio: "1:1",
    output_resolution: "1K",
    temperature: 1,
    use_google_search: false,
    tag_images: true,
    dollhouse_view_from_step: null,
    real_photo_from_step: null,
    mood_board_from_step: null,
    include_dollhouse: true,
    include_real_photo: true,
    include_mood_board: true,
    include_product_images: true,
    include_product_categories: [],
    product_image_types: {},
    arbitrary_image_from_step: null
  };
}

export function defaultJudgeStep(model = FALLBACK_GENERATION_MODEL, judgeModel = FALLBACK_JUDGE_MODEL): StepData {
  return {
    _uid: nextUid(),
    type: "judge",
    name: "Judge",
    number_of_images: 4,
    prompt_version_id: "",
    model,
    aspect_ratio: "1:1",
    output_resolution: "1K",
    temperature: 1,
    use_google_search: false,
    tag_images: true,
    dollhouse_view_from_step: null,
    real_photo_from_step: null,
    mood_board_from_step: null,
    include_dollhouse: true,
    include_real_photo: true,
    include_mood_board: true,
    include_product_images: true,
    include_product_categories: [],
    product_image_types: {},
    arbitrary_image_from_step: null,
    judges: [
      {
        _uid: nextUid(),
        name: "",
        judge_model: judgeModel,
        judge_type: "individual",
        judge_prompt_version_id: "",
        tolerance_threshold: 1
      }
    ]
  };
}

export const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
export const RESOLUTIONS = ["1K", "2K", "4K"];

export const JUDGE_TYPES: { value: "batch" | "individual"; label: string; description: string }[] = [
  {
    value: "batch",
    label: "Batch",
    description: "Send all results in one request, pick the best"
  },
  {
    value: "individual",
    label: "Individual",
    description: "Score each result 1-100 in parallel"
  }
];

export const defaultPreviewSettings: PreviewSettings = {
  preview_model: null,
  preview_resolution: "512"
};

export const PREVIEW_RESOLUTIONS = ["512", "1K", "2K", "4K"];

export const defaultStrategySettings: StrategySettings = {
  model: FALLBACK_GENERATION_MODEL,
  aspect_ratio: "1:1",
  output_resolution: "1K",
  temperature: 1,
  use_google_search: false,
  tag_images: true,
  group_product_images: false,
  check_scene_accuracy: false,
  enable_multi_turn_context: false
};

export const DEFAULT_IMAGE_TYPE: ProductImageType = "featured-image";
const IMAGE_TYPE_VALUES = new Set<ProductImageType>(IMAGE_TYPE_OPTIONS.map((option) => option.value));

export function normalizeProductImageType(value: unknown): ProductImageType {
  return typeof value === "string" && IMAGE_TYPE_VALUES.has(value as ProductImageType) ? (value as ProductImageType) : DEFAULT_IMAGE_TYPE;
}

export function normalizeProductImageTypes(value: Record<string, unknown> | null | undefined): Record<string, ProductImageType> {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).map(([category, imageType]) => [category, normalizeProductImageType(imageType)]));
}

export const CANDIDATE_PRESETS = [1, 2, 4, 8] as const;
