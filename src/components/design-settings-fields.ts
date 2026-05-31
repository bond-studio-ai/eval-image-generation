export type FieldType = "select" | "boolean" | "product";
export type CatalogImageTag = "photo-image" | "tear-sheet" | "line-drawing";

export interface BaseFieldDef {
  key: string;
  label: string;
  type: FieldType;
}

export interface SelectFieldDef extends BaseFieldDef {
  type: "select";
  options: { value: string; label: string }[];
}

export interface BooleanFieldDef extends BaseFieldDef {
  type: "boolean";
}

export interface ProductFieldDef extends BaseFieldDef {
  type: "product";
  apiCategories: string[];
}

export type FieldDef = SelectFieldDef | BooleanFieldDef | ProductFieldDef;
export type ProductImageType = "featured-image" | "line-drawing" | "tear-sheet" | "arbitrary";
export type ArbitraryImageMap = Record<string, string | null>;

export interface CatalogProduct {
  id: string;
  name: string;
  category: { id: string; name: string } | null;
  productFamilyName: string | null;
  featuredImage: { id: string; url: string } | null;
}

export const PRODUCT_FIELDS: ProductFieldDef[] = [
  {
    key: "vanity",
    label: "Vanity",
    type: "product",
    apiCategories: ["Vanities", "Linen Cabinets"]
  },
  {
    key: "faucet",
    label: "Faucet",
    type: "product",
    apiCategories: ["Faucets", "Faucet Accessories"]
  },
  { key: "mirror", label: "Mirror", type: "product", apiCategories: ["Mirror"] },
  {
    key: "lighting",
    label: "Lighting",
    type: "product",
    apiCategories: ["Decorative Lighting", "Recessed Lights", "Light Bulbs"]
  },
  {
    key: "toilet",
    label: "Toilet",
    type: "product",
    apiCategories: ["Toilet", "Toilet Accessories"]
  },
  { key: "robeHook", label: "Robe Hook", type: "product", apiCategories: ["Robe Hooks"] },
  {
    key: "toiletPaperHolder",
    label: "Toilet Paper Holder",
    type: "product",
    apiCategories: ["Toilet Paper Holders"]
  },
  { key: "towelBar", label: "Towel Bar", type: "product", apiCategories: ["Towel Bars"] },
  { key: "towelRing", label: "Towel Ring", type: "product", apiCategories: ["Towel Rings"] },
  { key: "floorTile", label: "Floor Tile", type: "product", apiCategories: ["Tile"] },
  { key: "wallTile", label: "Wall Tile", type: "product", apiCategories: ["Tile"] },
  { key: "nicheTile", label: "Niche Tile", type: "product", apiCategories: ["Tile"] },
  { key: "showerWallTile", label: "Shower Wall Tile", type: "product", apiCategories: ["Tile"] },
  {
    key: "showerShortWallTile",
    label: "Shower Short Wall Tile",
    type: "product",
    apiCategories: ["Tile"]
  },
  { key: "showerFloorTile", label: "Shower Floor Tile", type: "product", apiCategories: ["Tile"] },
  { key: "curbTile", label: "Curb Tile", type: "product", apiCategories: ["Tile"] },
  { key: "paint", label: "Paint", type: "product", apiCategories: ["Paint"] },
  { key: "shelves", label: "Shelves", type: "product", apiCategories: ["Shelves"] },
  {
    key: "showerSystem",
    label: "Shower System",
    type: "product",
    apiCategories: ["Shower Systems", "Shower System Components"]
  },
  { key: "showerGlass", label: "Shower Glass", type: "product", apiCategories: ["Shower Glass"] },
  {
    key: "tub",
    label: "Tub",
    type: "product",
    apiCategories: ["Tubs", "Tub Accessories", "Tub Drains"]
  },
  { key: "tubDoor", label: "Tub Door", type: "product", apiCategories: ["Tub Doors"] },
  { key: "tubFiller", label: "Tub Filler", type: "product", apiCategories: ["Tub Filler"] },
  {
    key: "wallpaper",
    label: "Wallpaper",
    type: "product",
    apiCategories: ["Wallpaper", "Wallpaper Accessories"]
  },
  { key: "lvp", label: "LVP", type: "product", apiCategories: ["LVP"] }
];

const TILE_PATTERN_OPTIONS = [
  { value: "Horizontal", label: "Horizontal" },
  { value: "Vertical", label: "Vertical" },
  { value: "Herringbone", label: "Herringbone" },
  { value: "Stacked", label: "Stacked" },
  { value: "Offset", label: "Offset" },
  { value: "HalfOffset", label: "Half Offset" },
  { value: "ThirdOffset", label: "Third Offset" },
  { value: "Straight", label: "Straight" }
];

export const SETTING_FIELDS: (SelectFieldDef | BooleanFieldDef)[] = [
  {
    key: "wallpaperPlacement",
    label: "Wallpaper Placement",
    type: "select",
    options: [
      { value: "None", label: "None" },
      { value: "AllWalls", label: "All Walls" },
      { value: "VanityWall", label: "Vanity Wall" }
    ]
  },
  {
    key: "wallTilePlacement",
    label: "Wall Tile Placement",
    type: "select",
    options: [
      { value: "None", label: "None" },
      { value: "FullWall", label: "Full Wall" },
      { value: "HalfWall", label: "Half Wall" },
      { value: "VanityFullWall", label: "Vanity Full Wall" },
      { value: "VanityHalfWall", label: "Vanity Half Wall" }
    ]
  },
  {
    key: "lightingPlacement",
    label: "Lighting Placement",
    type: "select",
    options: [
      { value: "Above", label: "Above" },
      { value: "Side", label: "Side" },
      { value: "Ceiling", label: "Ceiling" }
    ]
  },
  {
    key: "mirrorPlacement",
    label: "Mirror Placement",
    type: "select",
    options: [
      { value: "CenterOnVanity", label: "Center on Vanity" },
      { value: "CenterOnSink", label: "Center on Sink" }
    ]
  },
  {
    key: "floorTilePattern",
    label: "Floor Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "wallTilePattern",
    label: "Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "nicheTilePattern",
    label: "Niche Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerWallTilePattern",
    label: "Shower Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerShortWallTilePattern",
    label: "Shower Short Wall Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "showerFloorTilePattern",
    label: "Shower Floor Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  {
    key: "curbTilePattern",
    label: "Curb Tile Pattern",
    type: "select",
    options: TILE_PATTERN_OPTIONS
  },
  { key: "isShowerGlassVisible", label: "Shower Glass Visible", type: "boolean" },
  { key: "isTubDoorVisible", label: "Tub Door Visible", type: "boolean" }
];

export const FIELDS: FieldDef[] = [...PRODUCT_FIELDS, ...SETTING_FIELDS];
const PRODUCT_IMAGE_TYPE_KEYS = PRODUCT_FIELDS.map((field) => `${field.key}ImageType`);
export const ALL_FIELD_KEYS = new Set([...FIELDS.map((field) => field.key), ...PRODUCT_IMAGE_TYPE_KEYS]);
export const DEFAULT_PRODUCT_IMAGE_TYPE: ProductImageType = "featured-image";

export const SLOT_TO_CATALOG_CATEGORY: Record<string, string> = {
  floorTile: "floor-tiles",
  toilet: "toilets",
  vanity: "vanities",
  faucet: "faucets",
  mirror: "mirrors",
  robeHook: "robe-hooks",
  toiletPaperHolder: "toilet-paper-holders",
  towelBar: "towel-bars",
  towelRing: "towel-rings",
  lighting: "lightings",
  nicheTile: "shower-wall-tiles",
  paint: "paints",
  shelves: "shelves",
  showerFloorTile: "shower-floor-tiles",
  curbTile: "shower-curb-tiles",
  showerSystem: "shower-systems",
  showerWallTile: "shower-wall-tiles",
  showerShortWallTile: "shower-wall-tiles",
  showerGlass: "shower-glasses",
  tub: "tubs",
  tubDoor: "tub-doors",
  tubFiller: "tub-fillers",
  wallpaper: "wallpapers",
  wallTile: "wall-tiles",
  lvp: "lvps"
};

export function getProductImageTypeKey(slotKey: string): string {
  return `${slotKey}ImageType`;
}

export function readProductImageType(value: unknown): ProductImageType | null {
  return value === "featured-image" || value === "line-drawing" || value === "tear-sheet" || value === "arbitrary" ? value : null;
}
