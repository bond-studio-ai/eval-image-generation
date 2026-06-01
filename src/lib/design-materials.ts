"use client";

import { localUrl } from "./api-base";
import { camelizeDeep } from "./casing";
import { asNumber, asRecord, buildObject, buildSurface, getScanContext, getShowers, isScanLike, OBJECT_SLOTS, SURFACE_SLOTS, visibilityStyling } from "./design-materials-build";
import type { CatalogProduct, RawDesignObject, ScanLike, UnitySlimDesignMaterials } from "./design-materials-types";
import { logger } from "./logger";

export type { UnitySlimDesignMaterials } from "./design-materials-types";

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
      const camel = camelizeDeep(rec) as RawDesignObject;
      const scan = asRecord(camel.scan);
      if (scan && isScanLike(scan)) return scan;
      if (isScanLike(camel)) return camel;
    }
  } catch (error) {
    logger.error("[design-materials] Failed to fetch project scan", error);
  }
  return null;
}

async function resolveScan(params: { roomData?: RawDesignObject; projectId?: string }): Promise<ScanLike | null> {
  const camelRoomData = params.roomData ? (camelizeDeep(params.roomData) as RawDesignObject) : null;
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
    logger.error("[design-materials] Failed to fetch catalog product", {
      category,
      productId,
      err: error
    });
    return null;
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- orchestrates the full design build (scan resolution + per-slot surface/object mapping loops); the branching mirrors the irreducible material domain
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
      const hasCurbInScan = getShowers(scan).some((shower) => {
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
    result.objects.showerGlass = { styling: visibilityStyling(params.design.isShowerGlassVisible) };
  }
  if (hasAlcoveTubInScan && !result.objects.tubDoor) {
    result.objects.tubDoor = { styling: visibilityStyling(params.design.isTubDoorVisible) };
  }

  return result;
}
