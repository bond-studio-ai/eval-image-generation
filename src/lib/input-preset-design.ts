export const INPUT_PRESET_DESIGN_FIELD_KEYS = [
  'vanity',
  'faucet',
  'mirror',
  'lighting',
  'toilet',
  'robeHook',
  'toiletPaperHolder',
  'towelBar',
  'towelRing',
  'floorTile',
  'wallTile',
  'nicheTile',
  'showerWallTile',
  'showerShortWallTile',
  'showerFloorTile',
  'curbTile',
  'paint',
  'shelves',
  'showerSystem',
  'showerGlass',
  'tub',
  'tubDoor',
  'tubFiller',
  'wallpaper',
  'wallpaperPlacement',
  'wallTilePlacement',
  'lightingPlacement',
  'mirrorPlacement',
  'isShowerGlassVisible',
  'isTubDoorVisible',
  'floorTileImageType',
  'toiletImageType',
  'vanityImageType',
  'faucetImageType',
  'mirrorImageType',
  'robeHookImageType',
  'toiletPaperHolderImageType',
  'towelBarImageType',
  'towelRingImageType',
  'lightingImageType',
  'nicheTileImageType',
  'paintImageType',
  'shelvesImageType',
  'showerFloorTileImageType',
  'curbTileImageType',
  'showerSystemImageType',
  'showerWallTileImageType',
  'showerShortWallTileImageType',
  'showerGlassImageType',
  'tubImageType',
  'tubDoorImageType',
  'tubFillerImageType',
  'wallpaperImageType',
  'wallTileImageType',
  'floorTilePattern',
  'nicheTilePattern',
  'showerFloorTilePattern',
  'curbTilePattern',
  'showerWallTilePattern',
  'showerShortWallTilePattern',
  'wallTilePattern',
] as const

export type InputPresetDesignFieldKey = (typeof INPUT_PRESET_DESIGN_FIELD_KEYS)[number]
export type InputPresetDesignFieldValue = string | boolean | null
export type InputPresetDesignFields = Partial<
  Record<InputPresetDesignFieldKey, InputPresetDesignFieldValue>
>

export const INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY: Record<string, string> = {
  vanity: 'vanities_url',
  faucet: 'faucets_url',
  mirror: 'mirrors_url',
  lighting: 'lightings_url',
  toilet: 'toilets_url',
  robeHook: 'robe_hooks_url',
  toiletPaperHolder: 'toilet_paper_holders_url',
  towelBar: 'towel_bars_url',
  towelRing: 'towel_rings_url',
  floorTile: 'floor_tiles_url',
  wallTile: 'wall_tiles_url',
  nicheTile: 'shower_wall_tiles_url',
  showerWallTile: 'shower_wall_tiles_url',
  showerShortWallTile: 'shower_wall_tiles_url',
  showerFloorTile: 'shower_floor_tiles_url',
  curbTile: 'shower_curb_tiles_url',
  paint: 'paints_url',
  shelves: 'shelves_url',
  showerSystem: 'shower_systems_url',
  showerGlass: 'shower_glasses_url',
  tub: 'tubs_url',
  tubDoor: 'tub_doors_url',
  tubFiller: 'tub_fillers_url',
  wallpaper: 'wallpapers_url',
}

export const INPUT_PRESET_SLOT_LABELS: Record<string, string> = {
  vanity: 'Vanity',
  faucet: 'Faucet',
  mirror: 'Mirror',
  lighting: 'Lighting',
  toilet: 'Toilet',
  robeHook: 'Robe Hook',
  toiletPaperHolder: 'Toilet Paper Holder',
  towelBar: 'Towel Bar',
  towelRing: 'Towel Ring',
  floorTile: 'Floor Tile',
  wallTile: 'Wall Tile',
  nicheTile: 'Niche Tile',
  showerWallTile: 'Shower Wall Tile',
  showerShortWallTile: 'Shower Short Wall Tile',
  showerFloorTile: 'Shower Floor Tile',
  curbTile: 'Curb Tile',
  paint: 'Paint',
  shelves: 'Shelves',
  showerSystem: 'Shower System',
  showerGlass: 'Shower Glass',
  tub: 'Tub',
  tubDoor: 'Tub Door',
  tubFiller: 'Tub Filler',
  wallpaper: 'Wallpaper',
}

export interface InputPresetStoredImage {
  slot: string
  label: string
  urlColumn: string
  url: string
  isArbitrary: boolean
}

function readStoredUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string' && entry.length > 0) ?? null
  }
  return null
}

export function getInputPresetStoredImages(data: Record<string, unknown>): InputPresetStoredImage[] {
  const entries = new Map<string, InputPresetStoredImage>()

  for (const [slot, urlColumn] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
    const url = readStoredUrl(data[urlColumn])
    if (!url) continue

    const existing = entries.get(urlColumn)
    const isArbitrary = data[`${slot}ImageType`] === 'arbitrary'
    const hasProductId = typeof data[slot] === 'string' && data[slot].length > 0

    if (!existing) {
      entries.set(urlColumn, {
        slot,
        label: INPUT_PRESET_SLOT_LABELS[slot] ?? slot,
        urlColumn,
        url,
        isArbitrary,
      })
      continue
    }

    if (!existing.isArbitrary && (isArbitrary || hasProductId)) {
      entries.set(urlColumn, {
        slot,
        label: INPUT_PRESET_SLOT_LABELS[slot] ?? slot,
        urlColumn,
        url,
        isArbitrary,
      })
    }
  }

  return Array.from(entries.values())
}
