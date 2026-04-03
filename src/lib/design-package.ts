import { INPUT_PRESET_DESIGN_FIELD_KEYS } from '@/lib/input-preset-design';

export interface DesignPackageOption {
  id: string;
  title?: string | null;
  name?: string | null;
  style?: string | null;
  materials?: Record<string, unknown> | null;
  vanityDict?: Record<string, string> | null;
  faucetDict?: Record<string, string> | null;
}

export function isPowderRoomLayoutName(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.toLowerCase().includes('powder room');
}

export function designSettingsFromPackage(
  pkg: DesignPackageOption | null | undefined,
  options?: { isPowderRoom?: boolean }
): Record<string, unknown> | null {
  const root =
    pkg && typeof pkg === 'object' && !Array.isArray(pkg)
      ? (pkg as unknown as Record<string, unknown>)
      : null;
  const materials =
    pkg?.materials && typeof pkg.materials === 'object' && !Array.isArray(pkg.materials)
      ? (pkg.materials as Record<string, unknown>)
      : null;
  const source = materials ?? root;

  if (!source) return null;

  const out: Record<string, unknown> = {};
  for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
    const value = source[key];
    if (typeof value === 'string' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }

  const vanityDict =
    root?.vanityDict && typeof root.vanityDict === 'object' && !Array.isArray(root.vanityDict)
      ? (root.vanityDict as Record<string, string>)
      : materials?.vanityDict && typeof materials.vanityDict === 'object' && !Array.isArray(materials.vanityDict)
        ? (materials.vanityDict as Record<string, string>)
      : null;
  const faucetDict =
    root?.faucetDict && typeof root.faucetDict === 'object' && !Array.isArray(root.faucetDict)
      ? (root.faucetDict as Record<string, string>)
      : materials?.faucetDict && typeof materials.faucetDict === 'object' && !Array.isArray(materials.faucetDict)
        ? (materials.faucetDict as Record<string, string>)
      : null;
  const vanitySizes = vanityDict
    ? Object.keys(vanityDict)
        .map((key) => Number(key))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b)
    : [];

  if (vanitySizes.length > 0) {
    const selectedSize = options?.isPowderRoom
      ? vanitySizes[0]
      : vanitySizes[vanitySizes.length - 1];
    const sizeKey = String(selectedSize);
    const vanityId = vanityDict?.[sizeKey];
    const faucetId = faucetDict?.[sizeKey];
    if (vanityId) out.vanity = vanityId;
    if (faucetId) out.faucet = faucetId;
  }

  return Object.keys(out).length > 0 ? out : null;
}
