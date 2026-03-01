/**
 * Handlebars-based prompt template rendering.
 * Used for both strategy runs and prompt version preview.
 *
 * Context variables (from input preset, camelCase):
 * - Scene: dollhouseView, realPhoto, moodBoard (URLs or empty)
 * - Products: vanity, faucet, floorTile, etc. (singular, the selected product in the preset)
 * - arbitrary: array of { url, tag }
 *
 * Handlebars syntax: {{variable}}, {{#if variable}}...{{/if}}
 *
 * Legacy: <tagname>content</tagname> is preprocessed to {{#if tagname}}content{{/if}}
 * for backward compatibility with existing prompts.
 */

import Handlebars from 'handlebars';

const SCENE_KEYS = ['dollhouse_view', 'real_photo', 'mood_board'] as const;
const PRODUCT_CATEGORIES = [
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

/** Singular camelCase for each category - the selected product in the preset. */
const TO_CAMEL_SINGULAR: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
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

const SCENE_TO_CAMEL: Record<string, string> = {
  dollhouse_view: 'dollhouseView',
  real_photo: 'realPhoto',
  mood_board: 'moodBoard',
};

/** Product data passed to templates. Open shape—each catalog/product type may have different attributes. */
export type ProductItem = Record<string, unknown>;

export interface PresetContextData {
  sceneImages: Record<string, string>;
  productImages: Record<string, string[]>;
  /** Enriched product data from catalog. If provided, used for template context. */
  productItems?: Record<string, ProductItem[]>;
  arbitrary: { url: string; tag?: string }[];
}

/** Convert snake_case to camelCase. */
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Get the conditional key for a tag: singular camelCase for products, camelCase for scene. */
function getConditionalKey(tagName: string): string {
  const snakeKey = tagName.replace(/-/g, '_');
  const singular = TO_CAMEL_SINGULAR[snakeKey as (typeof PRODUCT_CATEGORIES)[number]];
  if (singular) return singular;
  const sceneCamel = SCENE_TO_CAMEL[snakeKey];
  if (sceneCamel) return sceneCamel;
  return toCamel(snakeKey);
}

/**
 * Convert legacy <tagname>content</tagname> to {{#if key}}content{{/if}}.
 * Product categories use singular ({{#if vanity}}); scene uses camelCase ({{#if dollhouseView}}).
 */
function legacyTagsToHandlebars(template: string): string {
  return template.replace(
    /<([a-z][a-z0-9-]*)>([\s\S]*?)<\/\1>/g,
    (_match, tagName: string, content: string) => {
      const key = getConditionalKey(tagName);
      return `{{#if ${key}}}${content}{{/if}}`;
    },
  );
}

/**
 * Build Handlebars context from preset data.
 */
export function buildPresetContext(data: PresetContextData): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  for (const key of SCENE_KEYS) {
    ctx[SCENE_TO_CAMEL[key]] = data.sceneImages[key] ?? '';
  }

  for (const key of PRODUCT_CATEGORIES) {
    const items = data.productItems?.[key];
    const camelSingular = TO_CAMEL_SINGULAR[key];
    if (items && items.length > 0) {
      ctx[camelSingular] = items[0];
    } else {
      const urls = data.productImages[key] ?? [];
      if (urls.length > 0) {
        ctx[camelSingular] = { url: urls[0], name: '' };
      }
    }
  }

  ctx.arbitrary = data.arbitrary;

  return ctx;
}

/**
 * Compile and render a prompt template with the given context.
 * Returns the rendered string, or the original template on parse/render error.
 */
export function renderPromptTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  if (!template.trim()) return template;

  try {
    const normalized = legacyTagsToHandlebars(template);
    const compiled = Handlebars.compile(normalized, { noEscape: true });
    const rendered = compiled(context);

    // Clean up artifacts from conditional blocks (collapsed commas, etc.)
    return rendered
      .replace(/,(\s*,)+/g, ',')
      .replace(/,\s*\./g, '.')
      .replace(/:\s*,/g, ':')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } catch (err) {
    console.error('[handlebars-prompt] Render error:', err);
    return template;
  }
}
