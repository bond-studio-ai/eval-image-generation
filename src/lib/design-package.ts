import { INPUT_PRESET_DESIGN_FIELD_KEYS } from '@/lib/input-preset-design';

export interface DesignPackageOption {
  id: string;
  title?: string | null;
  name?: string | null;
  style?: string | null;
  materials?: Record<string, unknown> | null;
}

export function designSettingsFromPackage(
  pkg: DesignPackageOption | null | undefined
): Record<string, unknown> | null {
  const materials =
    pkg?.materials && typeof pkg.materials === 'object' && !Array.isArray(pkg.materials)
      ? pkg.materials
      : null;

  if (!materials) return null;

  const out: Record<string, unknown> = {};
  for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
    const value = materials[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}
