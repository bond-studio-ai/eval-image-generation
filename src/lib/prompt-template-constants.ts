/**
 * Shared constants for prompt template UI (conditionals, references).
 * Mirrors handlebars-prompt categories.
 */

export const PRODUCT_CATEGORIES = [
  'faucets',
  'lightings',
  'lvps',
  'mirrors',
  'paints',
  'robe_hooks',
  'shelves',
  'shower_glasses',
  'shower_systems',
  'floor_tiles',
  'wall_tiles',
  'shower_wall_tiles',
  'shower_floor_tiles',
  'shower_curb_tiles',
  'toilet_paper_holders',
  'toilets',
  'towel_bars',
  'towel_rings',
  'tub_doors',
  'tub_fillers',
  'tubs',
  'vanities',
  'wallpapers',
] as const;

/** Singular camelCase for template: products.vanity, products.faucet, etc. */
export const TO_CAMEL_SINGULAR: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  faucets: 'faucet',
  lightings: 'lighting',
  lvps: 'lvp',
  mirrors: 'mirror',
  paints: 'paint',
  robe_hooks: 'robeHook',
  shelves: 'shelf',
  shower_glasses: 'showerGlass',
  shower_systems: 'showerSystem',
  floor_tiles: 'floorTile',
  wall_tiles: 'wallTile',
  shower_wall_tiles: 'showerWallTile',
  shower_floor_tiles: 'showerFloorTile',
  shower_curb_tiles: 'showerCurbTile',
  toilet_paper_holders: 'toiletPaperHolder',
  toilets: 'toilet',
  towel_bars: 'towelBar',
  towel_rings: 'towelRing',
  tub_doors: 'tubDoor',
  tub_fillers: 'tubFiller',
  tubs: 'tub',
  vanities: 'vanity',
  wallpapers: 'wallpaper',
};

export const SCENE_KEYS = ['dollhouse_view', 'real_photo', 'mood_board'] as const;
export const SCENE_TO_CAMEL: Record<(typeof SCENE_KEYS)[number], string> = {
  dollhouse_view: 'dollhouseView',
  real_photo: 'realPhoto',
  mood_board: 'moodBoard',
};

/**
 * Design-only paths for conditionals: fields not covered by `products.*` (see TO_CAMEL_SINGULAR /
 * REFERENCE_OPTIONS). Patterns, placements, visibility, niche/short-wall/curb slots where the
 * product key differs (e.g. design.curbTile vs products.showerCurbTile).
 */
export const DESIGN_PROMPT_PATHS = [
  'design.floorTilePattern',
  'design.nicheTile',
  'design.nicheTilePattern',
  'design.showerFloorTilePattern',
  'design.curbTile',
  'design.curbTilePattern',
  'design.showerWallTilePattern',
  'design.showerShortWallTile',
  'design.showerShortWallTilePattern',
  'design.wallpaperPlacement',
  'design.wallTilePlacement',
  'design.wallTilePattern',
  'design.mirrorPlacement',
  'design.lightingPlacement',
  'design.isShowerGlassVisible',
  'design.isTubDoorVisible',
] as const;

/** Display labels for conditionals: product categories + scene + design */
export const CONDITIONAL_OPTIONS: { value: string; label: string; isProduct: boolean }[] = [
  ...PRODUCT_CATEGORIES.map((k) => ({
    value: TO_CAMEL_SINGULAR[k],
    label: toTitleCase(TO_CAMEL_SINGULAR[k]),
    isProduct: true,
  })),
  ...SCENE_KEYS.map((k) => ({
    value: SCENE_TO_CAMEL[k],
    label: toTitleCase(SCENE_TO_CAMEL[k].replace(/([A-Z])/g, ' $1').trim()),
    isProduct: false,
  })),
  ...DESIGN_PROMPT_PATHS.map((path) => {
    const field = path.slice('design.'.length);
    return {
      value: path,
      label: `Design: ${toTitleCase(field)}`,
      isProduct: false,
    };
  }),
];

/** Display labels for reference: product categories only */
export const REFERENCE_OPTIONS = PRODUCT_CATEGORIES.map((k) => ({
  value: k,
  singular: TO_CAMEL_SINGULAR[k],
  label: toTitleCase(TO_CAMEL_SINGULAR[k]),
}));

function toTitleCase(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}
