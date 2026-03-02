/**
 * Handlebars-based prompt template rendering.
 * Used for both strategy runs and prompt version preview.
 *
 * Context variables (from input preset, camelCase):
 * - Scene: dollhouseView, realPhoto, moodBoard (URLs or empty)
 * - Products: products.vanity, products.faucet, products.floorTile, etc. (e.g. {{products.vanity.type}})
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

/** Title-case a string (e.g. "hello world" -> "Hello World"). Leaves URLs unchanged. */
function toTitleCase(s: string): string {
  if (typeof s !== 'string' || s.length === 0) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return s
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Recursively title-case all string values in an object (reference/product data). Skips URLs. */
function titleCaseReferenceValues(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return toTitleCase(obj);
  if (Array.isArray(obj)) return obj.map(titleCaseReferenceValues);
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = titleCaseReferenceValues(v);
    }
    return out;
  }
  return obj;
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

/** Check if tag is a product category (vs scene). */
function isProductTag(tagName: string): boolean {
  const snakeKey = tagName.replace(/-/g, '_');
  return PRODUCT_CATEGORIES.includes(snakeKey as (typeof PRODUCT_CATEGORIES)[number]);
}

/**
 * Convert legacy <tagname>content</tagname> to {{#if key}}content{{/if}}.
 * Products use products.vanity, products.faucet, etc.; scene uses dollhouseView, etc.
 */
function legacyTagsToHandlebars(template: string): string {
  return template.replace(
    /<([a-z][a-z0-9-]*)>([\s\S]*?)<\/\1>/g,
    (_match, tagName: string, content: string) => {
      const key = getConditionalKey(tagName);
      const ifKey = isProductTag(tagName) ? `products.${key}` : key;
      return `{{#if ${ifKey}}}${content}{{/if}}`;
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

  const products: Record<string, unknown> = {};
  for (const key of PRODUCT_CATEGORIES) {
    const items = data.productItems?.[key];
    const camelSingular = TO_CAMEL_SINGULAR[key];
    if (items && items.length > 0) {
      products[camelSingular] = titleCaseReferenceValues(items[0]);
    } else {
      const urls = data.productImages[key] ?? [];
      if (urls.length > 0) {
        products[camelSingular] = { url: urls[0], name: '' };
      }
    }
  }
  ctx.products = products;

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
    return rendered.trim();
  } catch (err) {
    console.error('[handlebars-prompt] Render error:', err);
    return template;
  }
}
