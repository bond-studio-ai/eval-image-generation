// ------------------------------------
// Input category constants
// ------------------------------------

export const CATEGORY_LABELS: Record<string, string> = {
  faucets: "Faucets",
  lightings: "Lightings",
  lvps: "LVPs",
  mirrors: "Mirrors",
  paints: "Paints",
  robe_hooks: "Robe Hooks",
  shelves: "Shelves",
  shower_glasses: "Shower Glasses",
  shower_systems: "Shower Systems",
  floor_tiles: "Floor Tiles",
  wall_tiles: "Wall Tiles",
  shower_wall_tiles: "Shower Wall Tiles",
  shower_floor_tiles: "Shower Floor Tiles",
  shower_curb_tiles: "Shower Curb Tiles",
  toilet_paper_holders: "Toilet Paper Holders",
  toilets: "Toilets",
  towel_bars: "Towel Bars",
  towel_rings: "Towel Rings",
  tub_doors: "Tub Doors",
  tub_fillers: "Tub Fillers",
  tubs: "Tubs",
  vanities: "Vanities",
  wallpapers: "Wallpapers"
};

// ------------------------------------
// Evaluations
// ------------------------------------

export const CATEGORY_SPECIFIC_ISSUES: Record<string, readonly string[]> = {
  faucets: ["Converted to widespread", "Incorrect shape", "Incorrect detailing", "Incorrect handle placement"],
  lightings: ["Incorrect armature shape", "Incorrect number of lights"],
  vanities: ["Incorrect base/legs shape", "Incorrect cabinet doors & drawers detailing"],
  mirrors: ["Incorrect shape"],
  shower_systems: ["Added a hand shower", "Incorrect shower head shape", "Incorrect temp valve shape", "Incorrect tub spout shape", "Added an extra tub spout"],
  toilets: ["Flush hardware missing", "Incorrect flush hardware location"],
  tub_fillers: ["Incorrect shape", "Incorrect detailing"]
};
