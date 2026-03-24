/** Parse textarea JSON for input preset `design_settings` (adapters_Design shape). */
export function parseDesignSettingsPayload(
  text: string,
): { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === '{}') {
    return { ok: true, value: null }
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        ok: false,
        error: 'Design settings must be a JSON object (not an array or primitive).',
      }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, error: 'Invalid JSON in design settings.' }
  }
}

export function designSettingsToFormText(value: unknown): string {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return '{}'
  const o = value as Record<string, unknown>
  if (Object.keys(o).length === 0) return '{}'
  return JSON.stringify(value, null, 2)
}

export function hasDesignSettingsKeys(value: Record<string, unknown> | null): boolean {
  return value != null && Object.keys(value).length > 0
}
