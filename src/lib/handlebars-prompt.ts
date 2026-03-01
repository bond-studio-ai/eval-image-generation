/**
 * Handlebars-based prompt template rendering.
 * Used for both strategy runs and prompt version preview.
 *
 * Context variables (from input preset):
 * - Scene: dollhouse_view, real_photo, mood_board (URLs or empty)
 * - Products: faucets, lightings, lvps, mirrors, etc. (arrays of URLs)
 * - arbitrary: array of { url, tag }
 * - product_category_labels: comma-separated labels of present categories
 *
 * Handlebars syntax: {{variable}}, {{#if variable}}...{{/if}}, {{#each items}}...{{/each}}
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

const PRODUCT_LABELS: Record<(typeof PRODUCT_CATEGORIES)[number], string> = {
  faucets: 'Faucet',
  lightings: 'Lighting',
  lvps: 'LVP',
  mirrors: 'Mirror',
  paints: 'Paint',
  robe_hooks: 'Robe hook',
  shelves: 'Shelf',
  shower_glasses: 'Shower glass',
  shower_systems: 'Shower system',
  floor_tiles: 'Floor tile',
  wall_tiles: 'Wall tile',
  shower_wall_tiles: 'Shower wall tile',
  shower_floor_tiles: 'Shower floor tile',
  shower_curb_tiles: 'Shower curb tile',
  toilet_paper_holders: 'Toilet paper holder',
  toilets: 'Toilet',
  towel_bars: 'Towel bar',
  towel_rings: 'Towel ring',
  tub_doors: 'Tub door',
  tub_fillers: 'Tub filler',
  tubs: 'Tub',
  vanities: 'Vanity',
  wallpapers: 'Wallpaper',
};

export interface PresetContextData {
  sceneImages: Record<string, string>;
  productImages: Record<string, string[]>;
  arbitrary: { url: string; tag?: string }[];
}

/**
 * Convert legacy <tagname>content</tagname> to {{#if tagname}}content{{/if}}.
 * Tag names with hyphens are converted to underscores for Handlebars keys.
 */
function legacyTagsToHandlebars(template: string): string {
  return template.replace(
    /<([a-z][a-z0-9-]*)>([\s\S]*?)<\/\1>/g,
    (_match, tagName: string, content: string) => {
      const key = tagName.replace(/-/g, '_');
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
    ctx[key] = data.sceneImages[key] ?? '';
  }

  for (const key of PRODUCT_CATEGORIES) {
    const urls = data.productImages[key] ?? [];
    ctx[key] = urls;
  }

  ctx.arbitrary = data.arbitrary;

  const presentLabels = PRODUCT_CATEGORIES.filter(
    (k) => (data.productImages[k]?.length ?? 0) > 0,
  ).map((k) => PRODUCT_LABELS[k]);
  ctx.product_category_labels = presentLabels;

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
