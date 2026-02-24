/**
 * Fixed color assignments for strategy property badges.
 * Each property type always gets the same color for visual consistency.
 */

export const STRATEGY_PROPERTY_COLORS = {
  model:           { bg: 'bg-purple-100',  text: 'text-purple-700' },
  aspectRatio:     { bg: 'bg-blue-100',    text: 'text-blue-700' },
  resolution:      { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  temperature:     { bg: 'bg-amber-100',   text: 'text-amber-700' },
  tagImages:       { bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  googleSearch:    { bg: 'bg-rose-100',    text: 'text-rose-700' },
} as const;

export type PropertyKey = keyof typeof STRATEGY_PROPERTY_COLORS;

export function propertyBadgeClasses(key: PropertyKey): string {
  const c = STRATEGY_PROPERTY_COLORS[key];
  return `${c.bg} ${c.text}`;
}
