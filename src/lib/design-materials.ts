'use client';

import { localUrl } from './api-base';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DESIGN_SLOT_TO_CATEGORY: Record<string, string> = {
  floorTile: 'floor_tiles',
  toilet: 'toilets',
  vanity: 'vanities',
  faucet: 'faucets',
  mirror: 'mirrors',
  robeHook: 'robe_hooks',
  toiletPaperHolder: 'toilet_paper_holders',
  towelBar: 'towel_bars',
  towelRing: 'towel_rings',
  lighting: 'lightings',
  nicheTile: 'shower_wall_tiles',
  paint: 'paints',
  shelves: 'shelves',
  showerFloorTile: 'shower_floor_tiles',
  curbTile: 'shower_curb_tiles',
  showerSystem: 'shower_systems',
  showerWallTile: 'shower_wall_tiles',
  showerShortWallTile: 'shower_wall_tiles',
  showerGlass: 'shower_glasses',
  tub: 'tubs',
  tubDoor: 'tub_doors',
  tubFiller: 'tub_fillers',
  wallpaper: 'wallpapers',
  wallTile: 'wall_tiles',
};

type TextureScale = { x: number | null; y: number | null };
type ScanLike = Record<string, unknown>;
type CatalogProduct = Record<string, unknown>;

type SurfaceItem = {
  productId?: string;
  texture: string;
  scale: { x: string; y: string };
  placement?: string;
};

type ObjectItem = {
  productId?: string;
  asset?: string | null;
  size?: { length: string; width: string; height: string };
  styling: 'Default' | 'Hidden' | 'Removed';
  placement?: string;
  rotation?: number;
  numberOfSinks?: number;
  counterHeight?: string;
  sinkOffset?: string;
};

export type UnitySlimDesignMaterials = {
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
};

const SURFACE_SLOTS = [
  'floorTile',
  'showerWallTile',
  'showerFloorTile',
  'showerShortWallTile',
  'curbTile',
  'nicheTile',
  'paint',
  'wallpaper',
  'wallTile',
] as const;

const OBJECT_SLOTS = [
  'toilet',
  'tub',
  'tubDoor',
  'tubFiller',
  'vanity',
  'faucet',
  'mirror',
  'lighting',
  'shelves',
  'robeHook',
  'toiletPaperHolder',
  'towelBar',
  'towelRing',
  'showerGlass',
  'showerSystem',
] as const;

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function toCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => toCamelCase(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      snakeToCamel(key),
      toCamelCase(entry),
    ]),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isScanLike(value: unknown): value is ScanLike {
  const rec = asRecord(value);
  return !!rec && ('areas' in rec || 'niches' in rec || 'tubs' in rec);
}

async function fetchProjectScan(projectId: string): Promise<ScanLike | null> {
  try {
    const res = await fetch(localUrl(`projects/${projectId}`), { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const candidates: unknown[] = [
      json.data,
      json,
      Array.isArray(json.data) ? json.data[0] : null,
      asRecord(json.data)?.project,
      asRecord(json.data)?.data,
    ];
    for (const candidate of candidates) {
      const rec = asRecord(candidate);
      if (!rec) continue;
      const camel = toCamelCase(rec) as Record<string, unknown>;
      const scan = asRecord(camel.scan);
      if (scan && isScanLike(scan)) return scan;
      if (isScanLike(camel)) return camel;
    }
  } catch (err) {
    console.error('[design-materials] Failed to fetch project scan', err);
  }
  return null;
}

async function resolveScan(params: {
  roomData?: Record<string, unknown>;
  projectId?: string;
}): Promise<ScanLike | null> {
  const camelRoomData = params.roomData
    ? (toCamelCase(params.roomData) as Record<string, unknown>)
    : null;
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
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: CatalogProduct };
    return json.data ?? null;
  } catch (err) {
    console.error('[design-materials] Failed to fetch catalog product', { category, productId, err });
    return null;
  }
}

function getTextureScale(product: CatalogProduct, patternScale?: TextureScale | null): TextureScale {
  if (patternScale) return patternScale;
  const textureScale =
    asRecord(product.textureScale) ?? asRecord(asRecord(product.renderAttributes)?.textureScale);
  if (textureScale) {
    return {
      x: asNumber(textureScale.x),
      y: asNumber(textureScale.y),
    };
  }
  return {
    x: asNumber(product.textureScaleX),
    y: asNumber(product.textureScaleY),
  };
}

function getAssetId(product: CatalogProduct): string | null {
  return (
    asString(asRecord(product.renderAttributes)?.['3DAssetId']) ??
    asString(product['3DAssetId']) ??
    asString(product.assetId) ??
    null
  );
}

function readPatternTexture(
  product: CatalogProduct,
  patternType: unknown,
): { texture: string | null; scale: TextureScale | null } {
  const patternName = asString(patternType);
  if (!patternName) return { texture: null, scale: null };
  const key = `${patternName.charAt(0).toLowerCase()}${patternName.slice(1)}PatternId`;
  const patternInfoKey = `${patternName.charAt(0).toLowerCase()}${patternName.slice(1)}`;
  const patternInfo = asRecord(asRecord(product.patternInfo)?.[patternInfoKey]);
  return {
    texture: asString(product[key]),
    scale: patternInfo
      ? getTextureScale({}, asRecord(patternInfo.textureScale) as TextureScale | null)
      : null,
  };
}

function buildMaterialLike(product: CatalogProduct, productId: string): CatalogProduct {
  const renderAttributes = asRecord(product.renderAttributes) ?? {};
  return {
    id: productId,
    renderAttributes,
    textureScale: asRecord(product.textureScale) ?? {
      x: asNumber(product.textureScaleX),
      y: asNumber(product.textureScaleY),
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
    patternInfo: asRecord(product.patternInfo) ?? null,
    herringbonePatternId: product.herringbonePatternId ?? null,
    stackedPatternId: product.stackedPatternId ?? null,
    offsetPatternId: product.offsetPatternId ?? null,
    straightPatternId: product.straightPatternId ?? null,
    verticalPatternId: product.verticalPatternId ?? null,
    horizontalPatternId: product.horizontalPatternId ?? null,
  };
}

function buildSurface(product: CatalogProduct | null, slot: (typeof SURFACE_SLOTS)[number], design: Record<string, unknown>): SurfaceItem | null {
  if (!product) return null;
  const material = buildMaterialLike(product, asString(product.id) ?? '');
  const pattern = readPatternTexture(material, design[`${slot}Pattern`]);
  const texture = pattern.texture ?? getAssetId(material);
  if (!texture) return null;
  const scale = getTextureScale(material, pattern.scale);
  const out: SurfaceItem = {
    productId: asString(material.id) ?? undefined,
    texture,
    scale: {
      x: scale.x != null ? String(scale.x) : '1',
      y: scale.y != null ? String(scale.y) : '1',
    },
  };
  if (slot === 'wallpaper') out.placement = asString(design.wallpaperPlacement) ?? 'VanityWall';
  if (slot === 'wallTile') out.placement = asString(design.wallTilePlacement) ?? 'VanityHalfWall';
  return out;
}

function buildObject(
  product: CatalogProduct | null,
  slot: (typeof OBJECT_SLOTS)[number],
  design: Record<string, unknown>,
  scan: ScanLike,
): ObjectItem | null {
  const showers = Array.isArray(asRecord(scan.areas)?.showers)
    ? (asRecord(scan.areas)?.showers as unknown[])
    : [];
  const hasShowerInScan = showers.length > 0;
  const hasAlcoveTubInScan = Array.isArray(scan.tubs)
    ? scan.tubs.some((tub) => asRecord(tub)?.type === 'Alcove')
    : false;

  if (!product) {
    if (slot === 'showerGlass' && hasShowerInScan) {
      return { styling: design.isShowerGlassVisible === false ? 'Hidden' : 'Default' };
    }
    if (slot === 'tubDoor' && hasAlcoveTubInScan) {
      return { styling: design.isTubDoorVisible === false ? 'Hidden' : 'Default' };
    }
    return null;
  }

  const material = buildMaterialLike(product, asString(product.id) ?? '');
  const asset = getAssetId(material);
  if (!asset) return null;

  const out: ObjectItem = {
    productId: asString(material.id) ?? undefined,
    asset,
    size: {
      length: String(material.length ?? ''),
      width: String(material.width ?? ''),
      height: String(material.height ?? ''),
    },
    styling: 'Default',
  };

  if (slot === 'vanity') {
    const numberOfSinks = asNumber(material.numberOfSinks);
    if (numberOfSinks != null) out.numberOfSinks = numberOfSinks;
    const counterHeight = asString(material.counterHeight) ?? (material.counterHeight != null ? String(material.counterHeight) : null);
    const sinkOffset = asString(material.sinkOffset) ?? (material.sinkOffset != null ? String(material.sinkOffset) : null);
    if (counterHeight) out.counterHeight = counterHeight;
    if (sinkOffset) out.sinkOffset = sinkOffset;
  }
  if (slot === 'mirror') {
    out.placement = asString(design.mirrorPlacement) ?? 'CenterOnSink';
  }
  if (slot === 'lighting') {
    const placement = asString(design.lightingPlacement) ?? 'Above';
    out.placement = placement;
    if (placement === 'Above') out.rotation = asNumber(material.abovePlacementDefaultRotation) ?? 0;
    if (placement === 'Side') out.rotation = asNumber(material.sidePlacementDefaultRotation) ?? 0;
  }
  if (slot === 'tubFiller') {
    const mountingPosition = asString(material.mountingPosition);
    if (mountingPosition) out.placement = mountingPosition;
  }
  if (slot === 'showerGlass' && design.isShowerGlassVisible === false) {
    out.styling = 'Hidden';
    delete out.productId;
  }
  if (slot === 'tubDoor' && design.isTubDoorVisible === false) {
    out.styling = 'Hidden';
    delete out.productId;
  }

  return out;
}

export async function buildDesignMaterials(params: {
  design: Record<string, unknown>;
  roomData?: Record<string, unknown>;
  projectId?: string;
}): Promise<UnitySlimDesignMaterials | null> {
  const scan = await resolveScan({ roomData: params.roomData, projectId: params.projectId });
  if (!scan) return null;

  const productBySlot = new Map<string, CatalogProduct | null>();
  await Promise.all(
    Object.entries(DESIGN_SLOT_TO_CATEGORY).map(async ([slot, category]) => {
      const productId = params.design[slot];
      if (typeof productId !== 'string' || !UUID_RE.test(productId)) return;
      const product = await fetchCatalogProduct(category, productId);
      productBySlot.set(slot, product ? { ...product, id: productId } : null);
    }),
  );

  const result: UnitySlimDesignMaterials = {
    id:
      (typeof params.design.id === 'string' && params.design.id) ||
      params.projectId ||
      'unknown',
    surfaces: {},
    objects: {},
  };

  for (const slot of SURFACE_SLOTS) {
    let product = productBySlot.get(slot) ?? null;
    if (slot === 'showerShortWallTile' && !product) product = productBySlot.get('showerWallTile') ?? null;
    if (slot === 'nicheTile' && !product && Array.isArray(scan.niches) && scan.niches.length > 0) {
      product = productBySlot.get('showerWallTile') ?? null;
    }
    if (slot === 'curbTile') {
      const showers = Array.isArray(asRecord(scan.areas)?.showers)
        ? (asRecord(scan.areas)?.showers as unknown[])
        : [];
      const hasCurbInScan = showers.some((shower) => {
        const s = asRecord(shower);
        return (asNumber(s?.curbHeight) ?? 0) > 0 && (asNumber(s?.curbThickness) ?? 0) > 0;
      });
      if (!product && hasCurbInScan) product = productBySlot.get('showerFloorTile') ?? null;
    }
    const surface = buildSurface(product, slot, params.design);
    if (surface) result.surfaces[slot] = surface;
  }

  for (const slot of OBJECT_SLOTS) {
    const object = buildObject(productBySlot.get(slot) ?? null, slot, params.design, scan);
    if (object) result.objects[slot] = object;
  }

  return result;
}
