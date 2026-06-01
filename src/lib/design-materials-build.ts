import { coerceString } from "./coerce-string";
import type { CatalogProduct, Color, ObjectComponent, ObjectItem, RawDesignObject, ScanLike, SurfaceItem, TextureScale } from "./design-materials-types";

/**
 * Pure projection layer for the design-materials builder. These helpers turn
 * unvalidated upstream catalog/scan blobs into the Unity "slim design" surface
 * and object shapes. They contain no I/O — the async orchestrator in
 * `./design-materials` resolves scans + catalog products and feeds them here —
 * so they're directly unit-testable with plain fixtures.
 */

export const SURFACE_SLOTS = ["floorTile", "showerWallTile", "showerFloorTile", "showerShortWallTile", "curbTile", "nicheTile", "paint", "wallpaper", "wallTile"] as const;

export const OBJECT_SLOTS = ["toilet", "tub", "tubDoor", "tubFiller", "vanity", "faucet", "mirror", "lighting", "shelves", "robeHook", "toiletPaperHolder", "towelBar", "towelRing", "showerGlass", "showerSystem"] as const;

export type SurfaceSlot = (typeof SURFACE_SLOTS)[number];
export type ObjectSlot = (typeof OBJECT_SLOTS)[number];

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

export function asRecord(value: unknown): RawDesignObject | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? (value as RawDesignObject) : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function pickHcl(value: unknown): Color | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const hue = asNumber(rec.hue);
  const chroma = asNumber(rec.chroma);
  const luminance = asNumber(rec.luminance);
  if (hue == null || chroma == null || luminance == null) return null;
  return { hue, chroma, luminance };
}

export function projectColorPalette(product: CatalogProduct): Color[] | undefined {
  const raw = product.colorPalette ?? product.color_palette;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const out = raw.flatMap((entry) => {
    const rec = asRecord(entry);
    const color = pickHcl(rec?.color ?? entry);
    return color ? [color] : [];
  });

  return out.length > 0 ? out : undefined;
}

export function projectComponents(product: CatalogProduct): ObjectComponent[] | undefined {
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

export function projectTileExtras(product: CatalogProduct): Pick<SurfaceItem, "shape" | "pieceLength" | "pieceWidth"> {
  const shape = asString(product.shape) ?? asString(asRecord(product.shape)?.code);
  const pieceLength = asNumber(product.pieceLength);
  const pieceWidth = asNumber(product.pieceWidth);
  return {
    ...(shape ? { shape } : {}),
    ...(pieceLength == null ? {} : { pieceLength: String(pieceLength) }),
    ...(pieceWidth == null ? {} : { pieceWidth: String(pieceWidth) })
  };
}

export function resolveTilePattern(product: CatalogProduct, slot: string, texture: string, design: RawDesignObject): string | undefined {
  for (const [key, pattern] of Object.entries(TILE_PATTERN_BY_ID_KEY)) {
    if (product[key] === texture) return pattern;
  }

  const fromDesign = design[`${slot}Pattern`];
  return typeof fromDesign === "string" && TILE_PATTERN_VALUES.has(fromDesign) ? fromDesign : undefined;
}

export function isScanLike(value: unknown): value is ScanLike {
  const rec = asRecord(value);
  return !!rec && ("areas" in rec || "niches" in rec || "tubs" in rec);
}

export function getTextureScale(product: CatalogProduct, patternScale?: TextureScale | null): TextureScale {
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

export function getAssetId(product: CatalogProduct): string | null {
  // Prefer the asset nested under `renderAttributes`, but fall back to the
  // top-level `3DAssetId` / `assetId` some upstream catalog shapes use — those
  // flow through `buildMaterialLike` (which spreads the product), so a material
  // carrying its asset there still resolves instead of being dropped.
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

/**
 * Normalize a raw catalog product into the shape the projection helpers read.
 * The only non-passthrough work is hoisting the dimension fields that may be
 * nested under `renderAttributes` up to the top level and guaranteeing
 * `renderAttributes` is a record. Every other field is read through the
 * null-tolerant `as*` helpers downstream, so we leave it as-is rather than
 * re-listing ~30 `?? null` defaults that change nothing.
 */
function buildMaterialLike(product: CatalogProduct, productId: string): CatalogProduct {
  const renderAttributes = asRecord(product.renderAttributes) ?? {};
  return {
    ...product,
    id: productId,
    renderAttributes,
    length: product.length ?? renderAttributes.length ?? null,
    width: product.width ?? renderAttributes.width ?? null,
    height: product.height ?? renderAttributes.height ?? null,
    pieceLength: product.pieceLength ?? renderAttributes.pieceLength ?? null,
    pieceWidth: product.pieceWidth ?? renderAttributes.pieceWidth ?? null
  };
}

export function buildSurface(product: CatalogProduct | null, slot: SurfaceSlot, design: RawDesignObject): SurfaceItem | null {
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

/** Styling for a visibility-toggled slot: explicitly `false` hides it. */
export function visibilityStyling(visible: unknown): "Hidden" | "Default" {
  return visible === false ? "Hidden" : "Default";
}

export function getShowers(scan: ScanLike): unknown[] {
  const showers = asRecord(scan.areas)?.showers;
  return Array.isArray(showers) ? showers : [];
}

export function getScanContext(scan: ScanLike): { hasShowerInScan: boolean; hasAlcoveTubInScan: boolean } {
  return {
    hasShowerInScan: getShowers(scan).length > 0,
    hasAlcoveTubInScan: Array.isArray(scan.tubs) ? scan.tubs.some((tub) => asRecord(tub)?.type === "Alcove") : false
  };
}

/**
 * For the two slots that can be present in a scan without a chosen product
 * (shower glass, tub door), return the styling-only object the scan implies, or
 * `null` if the slot has no scan-driven fallback.
 */
function fallbackStyling(slot: ObjectSlot, design: RawDesignObject, scan: ScanLike): ObjectItem | null {
  const { hasShowerInScan, hasAlcoveTubInScan } = getScanContext(scan);
  if (slot === "showerGlass" && hasShowerInScan) return { styling: visibilityStyling(design.isShowerGlassVisible) };
  if (slot === "tubDoor" && hasAlcoveTubInScan) return { styling: visibilityStyling(design.isTubDoorVisible) };
  return null;
}

/**
 * Per-slot enrichers returning the optional placement/sizing/visibility fields
 * to layer onto a built object. Keeping each slot's rule as its own entry
 * replaces a long `if (slot === …)` chain and stays individually readable.
 */
const OBJECT_ENRICHERS: Partial<Record<ObjectSlot, (material: CatalogProduct, design: RawDesignObject) => Partial<ObjectItem>>> = {
  vanity(material) {
    const out: Partial<ObjectItem> = {};
    const numberOfSinks = asNumber(material.numberOfSinks);
    if (numberOfSinks != null) out.numberOfSinks = numberOfSinks;
    const counterHeight = coerceString(material.counterHeight);
    const sinkOffset = coerceString(material.sinkOffset);
    if (counterHeight) out.counterHeight = counterHeight;
    if (sinkOffset) out.sinkOffset = sinkOffset;
    return out;
  },
  mirror(_material, design) {
    return { placement: asString(design.mirrorPlacement) ?? "CenterOnSink" };
  },
  lighting(material, design) {
    const placement = asString(design.lightingPlacement) ?? "Above";
    if (placement === "Above") return { placement, rotation: asNumber(material.abovePlacementDefaultRotation) ?? 0 };
    if (placement === "Side") return { placement, rotation: asNumber(material.sidePlacementDefaultRotation) ?? 0 };
    return { placement };
  },
  tubFiller(material) {
    const mountingPosition = asString(material.mountingPosition);
    return mountingPosition ? { placement: mountingPosition } : {};
  },
  showerGlass(_material, design) {
    return design.isShowerGlassVisible === false ? { styling: "Hidden" } : {};
  },
  tubDoor(_material, design) {
    return design.isTubDoorVisible === false ? { styling: "Hidden" } : {};
  }
};

export function buildObject(product: CatalogProduct | null, slot: ObjectSlot, design: RawDesignObject, scan: ScanLike): ObjectItem | null {
  if (!product) return fallbackStyling(slot, design, scan);

  const material = buildMaterialLike(product, asString(product.id) ?? "");
  const asset = getAssetId(material);
  if (!asset) return fallbackStyling(slot, design, scan);

  const out: ObjectItem = {
    productId: asString(material.id) ?? undefined,
    asset,
    size: {
      length: coerceString(material.length) ?? "",
      width: coerceString(material.width) ?? "",
      height: coerceString(material.height) ?? ""
    },
    styling: material.isRemoved ? "Removed" : "Default"
  };

  Object.assign(out, OBJECT_ENRICHERS[slot]?.(material, design));

  // Hidden slots carry styling only — never a product reference.
  if (out.styling === "Hidden") delete out.productId;

  const components = projectComponents(material);
  if (components) out.components = components;

  return out;
}
