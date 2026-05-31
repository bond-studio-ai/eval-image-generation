"use client";

import { localUrl } from "./api-base";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESIGN_SLOT_TO_CATEGORY: Record<string, string> = {
  floorTile: "floor_tiles",
  toilet: "toilets",
  vanity: "vanities",
  faucet: "faucets",
  mirror: "mirrors",
  robeHook: "robe_hooks",
  toiletPaperHolder: "toilet_paper_holders",
  towelBar: "towel_bars",
  towelRing: "towel_rings",
  lighting: "lightings",
  nicheTile: "shower_wall_tiles",
  paint: "paints",
  shelves: "shelves",
  showerFloorTile: "shower_floor_tiles",
  curbTile: "shower_curb_tiles",
  showerSystem: "shower_systems",
  showerWallTile: "shower_wall_tiles",
  showerShortWallTile: "shower_wall_tiles",
  showerGlass: "shower_glasses",
  tub: "tubs",
  tubDoor: "tub_doors",
  tubFiller: "tub_fillers",
  wallpaper: "wallpapers",
  wallTile: "wall_tiles"
};

interface TextureScale {
  x: number | null;
  y: number | null;
}

/**
 * Loose shape of the upstream JSON blobs (project scans, catalog products,
 * design selections) this module normalizes. Every key is optional `unknown`
 * because the payloads are unvalidated; the `as*` helpers narrow at runtime.
 * Declaring the keys explicitly lets us read them with dot access under
 * `noPropertyAccessFromIndexSignature` (an explicitly-declared key is never
 * served by the index signature), while the index signature still permits the
 * handful of genuinely dynamic, computed-key reads
 * (e.g. `product[patternId]`, `design[`${slot}Pattern`]`).
 */
interface RawDesignObject {
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

type ScanLike = RawDesignObject;
type CatalogProduct = RawDesignObject;
interface Color {
  hue: number;
  chroma: number;
  luminance: number;
}
interface ObjectComponent {
  categoryComponent: string;
  color: Color;
  materialType: string;
}

interface SurfaceItem {
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

interface ObjectItem {
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

const SURFACE_SLOTS = ["floorTile", "showerWallTile", "showerFloorTile", "showerShortWallTile", "curbTile", "nicheTile", "paint", "wallpaper", "wallTile"] as const;

const OBJECT_SLOTS = ["toilet", "tub", "tubDoor", "tubFiller", "vanity", "faucet", "mirror", "lighting", "shelves", "robeHook", "toiletPaperHolder", "towelBar", "towelRing", "showerGlass", "showerSystem"] as const;

const TILE_SURFACE_SLOTS = new Set<string>(["curbTile", "floorTile", "nicheTile", "showerFloorTile", "showerShortWallTile", "showerWallTile", "wallTile"]);

const TILE_PATTERN_BY_ID_KEY: Record<string, string> = {
  horizontalPatternId: "Horizontal",
  verticalPatternId: "Vertical",
  thirdOffsetPatternId: "ThirdOffset",
  halfOffsetPatternId: "HalfOffset",
  herringbonePatternId: "Herringbone",
  hexagonPatternId: "Hexagon",
  rhomboidCubePatternId: "RhomboidCube",
  triangularPatternId: "Triangular",
  horizontalPicketPatternId: "HorizontalPicket",
  verticalPicketPatternId: "VerticalPicket",
  fishScalePatternId: "FishScale",
  stackedPatternId: "Stacked",
  offsetPatternId: "Offset",
  straightPatternId: "Straight"
};

const TILE_PATTERN_VALUES = new Set(Object.values(TILE_PATTERN_BY_ID_KEY));

function snakeToCamel(value: string): string {
  return value.replaceAll(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => toCamelCase(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [snakeToCamel(key), toCamelCase(entry)]));
}

function asRecord(value: unknown): RawDesignObject | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as RawDesignObject) : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function pickHcl(value: unknown): Color | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const hue = asNumber(rec.hue);
  const chroma = asNumber(rec.chroma);
  const luminance = asNumber(rec.luminance);
  if (hue == null || chroma == null || luminance == null) return null;
  return { hue, chroma, luminance };
}

function projectColorPalette(product: CatalogProduct): Color[] | undefined {
  const raw = product.colorPalette ?? product.color_palette;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out = raw.flatMap((entry) => {
    const rec = asRecord(entry);
    const color = pickHcl(rec?.color ?? entry);
    return color ? [color] : [];
  });

  return out.length > 0 ? out : undefined;
}

function projectComponents(product: CatalogProduct): ObjectComponent[] | undefined {
  const raw = product.components;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out: ObjectComponent[] = [];
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;

    const categoryComponent = asString(rec.categoryComponent) ?? asString(asRecord(rec.categoryComponent)?.code);
    const materialType = asString(rec.materialType) ?? asString(asRecord(rec.materialType)?.code);
    const color = pickHcl(rec.color);

    if (categoryComponent && materialType && color) {
      out.push({ categoryComponent, color, materialType });
    }
  }

  return out.length > 0 ? out : undefined;
}

function projectTileExtras(product: CatalogProduct): Pick<SurfaceItem, "shape" | "pieceLength" | "pieceWidth"> {
  const shape = asString(product.shape) ?? asString(asRecord(product.shape)?.code);
  const pieceLength = asNumber(product.pieceLength);
  const pieceWidth = asNumber(product.pieceWidth);
  return {
    ...(shape ? { shape } : {}),
    ...(pieceLength == null ? {} : { pieceLength: String(pieceLength) }),
    ...(pieceWidth == null ? {} : { pieceWidth: String(pieceWidth) })
  };
}

function resolveTilePattern(product: CatalogProduct, slot: string, texture: string, design: RawDesignObject): string | undefined {
  for (const [key, pattern] of Object.entries(TILE_PATTERN_BY_ID_KEY)) {
    if (product[key] === texture) return pattern;
  }

  const fromDesign = design[`${slot}Pattern`];
  return typeof fromDesign === "string" && TILE_PATTERN_VALUES.has(fromDesign) ? fromDesign : undefined;
}

function isScanLike(value: unknown): value is ScanLike {
  const rec = asRecord(value);
  return !!rec && ("areas" in rec || "niches" in rec || "tubs" in rec);
}

async function fetchProjectScan(projectId: string): Promise<ScanLike | null> {
  try {
    const res = await fetch(localUrl(`projects/${projectId}`), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as RawDesignObject;
    // The BFF passes the upstream body through, which is `{ data: [project] }`.
    // We also accept the upstream-unwrapped shape and a few legacy variants so
    // this helper keeps working if it's ever called against a different proxy.
    const candidates: unknown[] = [Array.isArray(json.data) ? json.data[0] : null, json.data, json, asRecord(json.data)?.project, asRecord(json.data)?.data];
    for (const candidate of candidates) {
      const rec = asRecord(candidate);
      if (!rec) continue;
      const camel = toCamelCase(rec) as RawDesignObject;
      const scan = asRecord(camel.scan);
      if (scan && isScanLike(scan)) return scan;
      if (isScanLike(camel)) return camel;
    }
  } catch (error) {
    console.error("[design-materials] Failed to fetch project scan", error);
  }
  return null;
}

async function resolveScan(params: { roomData?: RawDesignObject; projectId?: string }): Promise<ScanLike | null> {
  const camelRoomData = params.roomData ? (toCamelCase(params.roomData) as RawDesignObject) : null;
  if (camelRoomData) {
    const roomScan = asRecord(camelRoomData.scan);
    if (roomScan && isScanLike(roomScan)) return roomScan;
    if (isScanLike(camelRoomData)) return camelRoomData;
  }
  if (params.projectId) return fetchProjectScan(params.projectId);
  return null;
}

async function fetchCatalogProduct(category: string, productId: string): Promise<CatalogProduct | null> {
  try {
    const res = await fetch(localUrl(`catalog/products/${category}/${productId}`), {
      cache: "no-store"
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: CatalogProduct };
    return json.data ?? null;
  } catch (error) {
    console.error("[design-materials] Failed to fetch catalog product", {
      category,
      productId,
      err: error
    });
    return null;
  }
}

function getTextureScale(product: CatalogProduct, patternScale?: TextureScale | null): TextureScale {
  if (patternScale) return patternScale;
  const textureScale = asRecord(product.textureScale) ?? asRecord(asRecord(product.renderAttributes)?.textureScale);
  if (textureScale) {
    return {
      x: asNumber(textureScale.x),
      y: asNumber(textureScale.y)
    };
  }
  return {
    x: asNumber(product.textureScaleX),
    y: asNumber(product.textureScaleY)
  };
}

function getAssetId(product: CatalogProduct): string | null {
  return asString(asRecord(product.renderAttributes)?.["3DAssetId"]) ?? asString(product["3DAssetId"]) ?? asString(product.assetId) ?? null;
}

function readPatternTexture(product: CatalogProduct, patternType: unknown): { texture: string | null; scale: TextureScale | null } {
  const patternName = asString(patternType);
  if (!patternName) return { texture: null, scale: null };
  const key = `${patternName.charAt(0).toLowerCase()}${patternName.slice(1)}PatternId`;
  const patternInfoKey = `${patternName.charAt(0).toLowerCase()}${patternName.slice(1)}`;
  const patternInfo = asRecord(asRecord(product.patternInfo)?.[patternInfoKey]);
  return {
    texture: asString(product[key]),
    scale: patternInfo ? getTextureScale({}, asRecord(patternInfo.textureScale) as TextureScale | null) : null
  };
}

function buildMaterialLike(product: CatalogProduct, productId: string): CatalogProduct {
  const renderAttributes = asRecord(product.renderAttributes) ?? {};
  return {
    id: productId,
    renderAttributes,
    textureScale: asRecord(product.textureScale) ?? {
      x: asNumber(product.textureScaleX),
      y: asNumber(product.textureScaleY)
    },
    length: product.length ?? renderAttributes.length ?? null,
    width: product.width ?? renderAttributes.width ?? null,
    height: product.height ?? renderAttributes.height ?? null,
    numberOfSinks: product.numberOfSinks ?? null,
    counterHeight: product.counterHeight ?? null,
    sinkOffset: product.sinkOffset ?? null,
    abovePlacementDefaultRotation: product.abovePlacementDefaultRotation ?? null,
    sidePlacementDefaultRotation: product.sidePlacementDefaultRotation ?? null,
    mountingPosition: product.mountingPosition ?? null,
    colorPalette: product.colorPalette ?? product.color_palette ?? null,
    components: product.components ?? null,
    shape: product.shape ?? null,
    pieceLength: product.pieceLength ?? renderAttributes.pieceLength ?? null,
    pieceWidth: product.pieceWidth ?? renderAttributes.pieceWidth ?? null,
    isRemoved: product.isRemoved ?? false,
    patternInfo: asRecord(product.patternInfo) ?? null,
    horizontalPatternId: product.horizontalPatternId ?? null,
    verticalPatternId: product.verticalPatternId ?? null,
    thirdOffsetPatternId: product.thirdOffsetPatternId ?? null,
    halfOffsetPatternId: product.halfOffsetPatternId ?? null,
    herringbonePatternId: product.herringbonePatternId ?? null,
    hexagonPatternId: product.hexagonPatternId ?? null,
    rhomboidCubePatternId: product.rhomboidCubePatternId ?? null,
    triangularPatternId: product.triangularPatternId ?? null,
    horizontalPicketPatternId: product.horizontalPicketPatternId ?? null,
    verticalPicketPatternId: product.verticalPicketPatternId ?? null,
    fishScalePatternId: product.fishScalePatternId ?? null,
    stackedPatternId: product.stackedPatternId ?? null,
    offsetPatternId: product.offsetPatternId ?? null,
    straightPatternId: product.straightPatternId ?? null
  };
}

function buildSurface(product: CatalogProduct | null, slot: (typeof SURFACE_SLOTS)[number], design: RawDesignObject): SurfaceItem | null {
  if (!product) return null;
  const material = buildMaterialLike(product, asString(product.id) ?? "");
  const pattern = readPatternTexture(material, design[`${slot}Pattern`]);
  const texture = pattern.texture ?? getAssetId(material);
  if (!texture) return null;
  const scale = getTextureScale(material, pattern.scale);
  const out: SurfaceItem = {
    productId: asString(material.id) ?? undefined,
    texture,
    scale: {
      x: scale.x == null ? "1" : String(scale.x),
      y: scale.y == null ? "1" : String(scale.y)
    }
  };
  if (slot === "wallpaper") out.placement = asString(design.wallpaperPlacement) ?? "VanityWall";
  if (slot === "wallTile") out.placement = asString(design.wallTilePlacement) ?? "VanityHalfWall";

  const colorPalette = projectColorPalette(material);
  if (colorPalette) out.colorPalette = colorPalette;

  if (TILE_SURFACE_SLOTS.has(slot)) {
    Object.assign(out, projectTileExtras(material));
    const resolvedPattern = resolveTilePattern(material, slot, texture, design);
    if (resolvedPattern) out.pattern = resolvedPattern;
  }

  return out;
}

function getStylingState(product: CatalogProduct): ObjectItem["styling"] {
  return product.isRemoved ? "Removed" : "Default";
}

function getScanContext(scan: ScanLike): { hasShowerInScan: boolean; hasAlcoveTubInScan: boolean } {
  const showers = Array.isArray(asRecord(scan.areas)?.showers) ? (asRecord(scan.areas)?.showers as unknown[]) : [];
  const hasAlcoveTubInScan = Array.isArray(scan.tubs) ? scan.tubs.some((tub) => asRecord(tub)?.type === "Alcove") : false;

  return {
    hasShowerInScan: showers.length > 0,
    hasAlcoveTubInScan
  };
}

function buildObject(product: CatalogProduct | null, slot: (typeof OBJECT_SLOTS)[number], design: RawDesignObject, scan: ScanLike): ObjectItem | null {
  const { hasShowerInScan, hasAlcoveTubInScan } = getScanContext(scan);

  if (!product) {
    if (slot === "showerGlass" && hasShowerInScan) {
      return { styling: design.isShowerGlassVisible === false ? "Hidden" : "Default" };
    }
    if (slot === "tubDoor" && hasAlcoveTubInScan) {
      return { styling: design.isTubDoorVisible === false ? "Hidden" : "Default" };
    }
    return null;
  }

  const material = buildMaterialLike(product, asString(product.id) ?? "");
  const asset = getAssetId(material);
  if (!asset) {
    if (slot === "showerGlass" && hasShowerInScan) {
      return { styling: design.isShowerGlassVisible === false ? "Hidden" : "Default" };
    }
    if (slot === "tubDoor" && hasAlcoveTubInScan) {
      return { styling: design.isTubDoorVisible === false ? "Hidden" : "Default" };
    }
    return null;
  }

  const out: ObjectItem = {
    productId: asString(material.id) ?? undefined,
    asset,
    size: {
      length: String(material.length ?? ""),
      width: String(material.width ?? ""),
      height: String(material.height ?? "")
    },
    styling: getStylingState(material)
  };

  if (slot === "vanity") {
    const numberOfSinks = asNumber(material.numberOfSinks);
    if (numberOfSinks != null) out.numberOfSinks = numberOfSinks;
    const counterHeight = asString(material.counterHeight) ?? (material.counterHeight == null ? null : String(material.counterHeight));
    const sinkOffset = asString(material.sinkOffset) ?? (material.sinkOffset == null ? null : String(material.sinkOffset));
    if (counterHeight) out.counterHeight = counterHeight;
    if (sinkOffset) out.sinkOffset = sinkOffset;
  }
  if (slot === "mirror") {
    out.placement = asString(design.mirrorPlacement) ?? "CenterOnSink";
  }
  if (slot === "lighting") {
    const placement = asString(design.lightingPlacement) ?? "Above";
    out.placement = placement;
    if (placement === "Above") out.rotation = asNumber(material.abovePlacementDefaultRotation) ?? 0;
    if (placement === "Side") out.rotation = asNumber(material.sidePlacementDefaultRotation) ?? 0;
  }
  if (slot === "tubFiller") {
    const mountingPosition = asString(material.mountingPosition);
    if (mountingPosition) out.placement = mountingPosition;
  }
  if (slot === "showerGlass" && design.isShowerGlassVisible === false) {
    out.styling = "Hidden";
    delete out.productId;
  }
  if (slot === "tubDoor" && design.isTubDoorVisible === false) {
    out.styling = "Hidden";
    delete out.productId;
  }

  if (out.styling === "Hidden") {
    delete out.productId;
  }

  const components = projectComponents(material);
  if (components) out.components = components;

  return out;
}

export async function buildDesignMaterials(params: { design: RawDesignObject; roomData?: RawDesignObject; projectId?: string }): Promise<UnitySlimDesignMaterials | null> {
  const scan = await resolveScan({
    ...(params.roomData === undefined ? {} : { roomData: params.roomData }),
    ...(params.projectId === undefined ? {} : { projectId: params.projectId })
  });
  if (!scan) return null;

  const productBySlot = new Map<string, CatalogProduct | null>();
  await Promise.all(
    Object.entries(DESIGN_SLOT_TO_CATEGORY).map(async ([slot, category]) => {
      const productId = params.design[slot];
      if (typeof productId !== "string" || !UUID_RE.test(productId)) return;
      const product = await fetchCatalogProduct(category, productId);
      productBySlot.set(slot, product ? { ...product, id: productId } : null);
    })
  );

  const result: UnitySlimDesignMaterials = {
    id: (typeof params.design.id === "string" && params.design.id) || params.projectId || "unknown",
    surfaces: {},
    objects: {}
  };

  for (const slot of SURFACE_SLOTS) {
    let product = productBySlot.get(slot) ?? null;
    if (slot === "showerShortWallTile" && !product) product = productBySlot.get("showerWallTile") ?? null;
    if (slot === "nicheTile" && !product && Array.isArray(scan.niches) && scan.niches.length > 0) {
      product = productBySlot.get("showerWallTile") ?? null;
    }
    if (slot === "curbTile") {
      const showers = Array.isArray(asRecord(scan.areas)?.showers) ? (asRecord(scan.areas)?.showers as unknown[]) : [];
      const hasCurbInScan = showers.some((shower) => {
        const record = asRecord(shower);
        return (asNumber(record?.curbHeight) ?? 0) > 0 && (asNumber(record?.curbThickness) ?? 0) > 0;
      });
      if (!product && hasCurbInScan) product = productBySlot.get("showerFloorTile") ?? null;
    }
    const surface = buildSurface(product, slot, params.design);
    if (surface) result.surfaces[slot] = surface;
  }

  for (const slot of OBJECT_SLOTS) {
    const object = buildObject(productBySlot.get(slot) ?? null, slot, params.design, scan);
    if (object) result.objects[slot] = object;
  }

  const { hasShowerInScan, hasAlcoveTubInScan } = getScanContext(scan);
  if (hasShowerInScan && !result.objects.showerGlass) {
    result.objects.showerGlass = {
      styling: params.design.isShowerGlassVisible === false ? "Hidden" : "Default"
    };
  }
  if (hasAlcoveTubInScan && !result.objects.tubDoor) {
    result.objects.tubDoor = {
      styling: params.design.isTubDoorVisible === false ? "Hidden" : "Default"
    };
  }

  return result;
}
