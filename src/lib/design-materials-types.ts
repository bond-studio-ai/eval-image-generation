export interface TextureScale {
  x: number | null;
  y: number | null;
}

/**
 * Loose shape of the upstream JSON blobs (project scans, catalog products,
 * design selections) the design-materials module normalizes. Every key is
 * optional `unknown` because the payloads are unvalidated; the `as*` helpers
 * narrow at runtime. Declaring the keys explicitly lets us read them with dot
 * access under `noPropertyAccessFromIndexSignature` (an explicitly-declared key
 * is never served by the index signature), while the index signature still
 * permits the handful of genuinely dynamic, computed-key reads
 * (e.g. `product[patternId]`, `design[`${slot}Pattern`]`).
 */
export interface RawDesignObject {
  [key: string]: unknown;
  id?: unknown;
  renderAttributes?: unknown;
  textureScale?: unknown;
  textureScaleX?: unknown;
  textureScaleY?: unknown;
  x?: unknown;
  y?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
  numberOfSinks?: unknown;
  counterHeight?: unknown;
  sinkOffset?: unknown;
  abovePlacementDefaultRotation?: unknown;
  sidePlacementDefaultRotation?: unknown;
  mountingPosition?: unknown;
  colorPalette?: unknown;
  color_palette?: unknown;
  color?: unknown;
  components?: unknown;
  categoryComponent?: unknown;
  materialType?: unknown;
  code?: unknown;
  hue?: unknown;
  chroma?: unknown;
  luminance?: unknown;
  shape?: unknown;
  pieceLength?: unknown;
  pieceWidth?: unknown;
  isRemoved?: unknown;
  patternInfo?: unknown;
  assetId?: unknown;
  "3DAssetId"?: unknown;
  horizontalPatternId?: unknown;
  verticalPatternId?: unknown;
  thirdOffsetPatternId?: unknown;
  halfOffsetPatternId?: unknown;
  herringbonePatternId?: unknown;
  hexagonPatternId?: unknown;
  rhomboidCubePatternId?: unknown;
  triangularPatternId?: unknown;
  horizontalPicketPatternId?: unknown;
  verticalPicketPatternId?: unknown;
  fishScalePatternId?: unknown;
  stackedPatternId?: unknown;
  offsetPatternId?: unknown;
  straightPatternId?: unknown;
  scan?: unknown;
  data?: unknown;
  project?: unknown;
  areas?: unknown;
  showers?: unknown;
  tubs?: unknown;
  niches?: unknown;
  type?: unknown;
  curbHeight?: unknown;
  curbThickness?: unknown;
  wallpaperPlacement?: unknown;
  wallTilePlacement?: unknown;
  mirrorPlacement?: unknown;
  lightingPlacement?: unknown;
  isShowerGlassVisible?: unknown;
  isTubDoorVisible?: unknown;
}

export type ScanLike = RawDesignObject;
export type CatalogProduct = RawDesignObject;

export interface Color {
  hue: number;
  chroma: number;
  luminance: number;
}

export interface ObjectComponent {
  categoryComponent: string;
  color: Color;
  materialType: string;
}

export interface SurfaceItem {
  productId?: string | undefined;
  texture: string;
  scale: { x: string; y: string };
  placement?: string;
  colorPalette?: Color[];
  shape?: string;
  pattern?: string;
  pieceLength?: string;
  pieceWidth?: string;
}

export interface ObjectItem {
  productId?: string | undefined;
  asset?: string | null;
  size?: { length: string; width: string; height: string };
  styling: "Default" | "Hidden" | "Removed";
  placement?: string;
  rotation?: number;
  numberOfSinks?: number;
  counterHeight?: string;
  sinkOffset?: string;
  components?: ObjectComponent[];
}

export interface UnitySlimDesignMaterials {
  id: string;
  surfaces: {
    floorTile?: SurfaceItem;
    showerWallTile?: SurfaceItem;
    showerFloorTile?: SurfaceItem;
    showerShortWallTile?: SurfaceItem;
    curbTile?: SurfaceItem;
    nicheTile?: SurfaceItem;
    paint?: SurfaceItem;
    wallpaper?: SurfaceItem;
    wallTile?: SurfaceItem;
  };
  objects: {
    toilet?: ObjectItem;
    tub?: ObjectItem;
    tubDoor?: ObjectItem;
    tubFiller?: ObjectItem;
    vanity?: ObjectItem;
    faucet?: ObjectItem;
    mirror?: ObjectItem;
    lighting?: ObjectItem;
    shelves?: ObjectItem;
    robeHook?: ObjectItem;
    toiletPaperHolder?: ObjectItem;
    towelBar?: ObjectItem;
    towelRing?: ObjectItem;
    showerGlass?: ObjectItem;
    showerSystem?: ObjectItem;
  };
}
