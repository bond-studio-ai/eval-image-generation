import { INPUT_PRESET_DESIGN_FIELD_KEYS } from "@/lib/input-preset-design";

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
  return typeof value === "string" && value.toLowerCase().includes("powder room");
}

interface RawDesignSource {
  [key: string]: unknown;
  vanityDict?: unknown;
  faucetDict?: unknown;
}

/** Return the first source that is a plain (non-array) object, as a string dict, else `null`. */
function pickStringDict(...sources: unknown[]): Record<string, string> | null {
  for (const source of sources) {
    if (source && typeof source === "object" && !Array.isArray(source)) {
      return source as Record<string, string>;
    }
  }
  return null;
}

export function designSettingsFromPackage(pkg: DesignPackageOption | null | undefined, options?: { isPowderRoom?: boolean }): Record<string, unknown> | null {
  const root = pkg && typeof pkg === "object" && !Array.isArray(pkg) ? (pkg as unknown as RawDesignSource) : null;
  const materials = pkg?.materials && typeof pkg.materials === "object" && !Array.isArray(pkg.materials) ? (pkg.materials as RawDesignSource) : null;
  const source = materials ?? root;

  if (!source) return null;

  const out: Record<string, unknown> = {};
  for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "boolean") {
      out[key] = value;
    } else if (value === null) {
      out[key] = null;
    }
  }

  const vanityDict = pickStringDict(root?.vanityDict, materials?.vanityDict);
  const faucetDict = pickStringDict(root?.faucetDict, materials?.faucetDict);
  const vanitySizes = vanityDict
    ? Object.keys(vanityDict)
        .flatMap((key) => {
          const value = Number(key);
          return Number.isFinite(value) ? [value] : [];
        })
        .sort((a, b) => a - b)
    : [];

  if (vanitySizes.length > 0) {
    const selectedSize = options?.isPowderRoom ? vanitySizes[0] : vanitySizes.at(-1);
    const sizeKey = String(selectedSize);
    const vanityId = vanityDict?.[sizeKey];
    const faucetId = faucetDict?.[sizeKey];
    if (vanityId) out["vanity"] = vanityId;
    if (faucetId) out["faucet"] = faucetId;
  }

  return Object.keys(out).length > 0 ? out : null;
}
