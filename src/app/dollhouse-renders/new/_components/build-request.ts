import {
  validateUnitySlimDesign,
  type CreateDollhouseRenderBody,
  type DollhouseCameraFrame,
  type DollhouseImageConfig,
  type DollhouseRenderConfig,
  type DollhouseRenderMode,
  type DollhouseSsmParams,
  type DollhouseStyleOverride,
  type UnitySlimDesignMaterials,
} from '@/lib/dollhouse-renders';
import type { SsmParamsState } from './ssm-params-editor';

export type ImageFormat = DollhouseImageConfig['format'];
export type RenderModeOption = DollhouseRenderMode | 'default';

export interface ImageConfigState {
  format: ImageFormat;
  width: string;
  height: string;
  superSamplingMultiplier: string;
}

export interface RenderConfigState {
  renderMode: RenderModeOption;
  advancedSegmentation: boolean;
  overrideCameraHeight: string;
}

export const FORMAT_OPTIONS: { value: ImageFormat; label: string }[] = [
  { value: 'Png', label: 'PNG' },
  { value: 'Jpeg', label: 'JPEG' },
  { value: 'Exr', label: 'EXR' },
];

export const RENDER_MODE_OPTIONS: { value: RenderModeOption; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'STANDARD_LIT', label: 'Standard Lit' },
  { value: 'LINEWORK', label: 'Linework' },
  { value: 'COLORIZED_LINEWORK', label: 'Colorized Linework' },
];

export const DEFAULT_IMAGE_CONFIG: ImageConfigState = {
  // Match the service's existing dollhouse-capture defaults. The project
  // camera frames are 4:3 (`aspect: 1.333...`); sending a square 1024x1024 JPEG
  // can get accepted by the gateway but stall before the final callback.
  format: 'Png',
  width: '1920',
  height: '1440',
  superSamplingMultiplier: '',
};

export const DEFAULT_RENDER_CONFIG: RenderConfigState = {
  renderMode: 'default',
  advancedSegmentation: false,
  overrideCameraHeight: '',
};

export const DEFAULT_SSM_PARAMS: SsmParamsState = {
  addressablesCatalog: '',
  host: '',
  uploadBucket: '',
};

export function buildImageConfig(state: ImageConfigState): DollhouseImageConfig {
  const width = Number.parseInt(state.width, 10);
  const height = Number.parseInt(state.height, 10);
  const ssm = state.superSamplingMultiplier
    ? Number.parseInt(state.superSamplingMultiplier, 10)
    : null;
  return {
    format: state.format,
    width: Number.isFinite(width) && width > 0 ? width : 1920,
    height: Number.isFinite(height) && height > 0 ? height : 1440,
    ...(ssm !== null && Number.isFinite(ssm) && ssm > 0 ? { superSamplingMultiplier: ssm } : {}),
  };
}

function buildRenderConfig(state: RenderConfigState): DollhouseRenderConfig | undefined {
  const config: DollhouseRenderConfig = {};
  if (state.renderMode !== 'default') {
    config.renderMode = state.renderMode;
  }
  if (state.advancedSegmentation) {
    config.advancedSegmentation = true;
  }
  if (state.overrideCameraHeight) {
    const v = Number.parseFloat(state.overrideCameraHeight);
    if (Number.isFinite(v)) config.overrideCameraHeight = v;
  }
  return Object.keys(config).length > 0 ? config : undefined;
}

function buildSsmParams(state: SsmParamsState): DollhouseSsmParams | undefined {
  const out: DollhouseSsmParams = {};
  if (state.addressablesCatalog.trim()) out.addressablesCatalog = state.addressablesCatalog.trim();
  if (state.host.trim()) out.host = state.host.trim();
  if (state.uploadBucket.trim()) out.uploadBucket = state.uploadBucket.trim();
  return Object.keys(out).length > 0 ? out : undefined;
}

interface BuildCreateBodyInput {
  projectId: string;
  designMaterials: UnitySlimDesignMaterials;
  roomData: Record<string, unknown>;
  cameraFrames: DollhouseCameraFrame[];
  imageConfig: ImageConfigState;
  renderConfig: RenderConfigState;
  ssmParams: SsmParamsState;
  styleOverrides: DollhouseStyleOverride[];
}

export interface OverrideParseResult<T> {
  /** `true` when the user typed something we successfully parsed. */
  provided: boolean;
  value: T | null;
  error: string | null;
}

function parseJsonObject(raw: string): {
  value: Record<string, unknown> | null;
  error: string | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: 'Expected a JSON object.' };
    }
    return { value: parsed as Record<string, unknown>, error: null };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : 'Invalid JSON.' };
  }
}

export function parseDesignMaterialsOverride(
  raw: string,
): OverrideParseResult<UnitySlimDesignMaterials> {
  const trimmed = raw.trim();
  if (!trimmed) return { provided: false, value: null, error: null };
  const parsed = parseJsonObject(raw);
  if (parsed.error || !parsed.value) {
    return { provided: true, value: null, error: parsed.error ?? 'Invalid JSON.' };
  }
  const validated = validateUnitySlimDesign(parsed.value);
  if (!validated.ok) return { provided: true, value: null, error: validated.error };
  return { provided: true, value: validated.value, error: null };
}

export function parseRoomDataOverride(raw: string): OverrideParseResult<Record<string, unknown>> {
  const trimmed = raw.trim();
  if (!trimmed) return { provided: false, value: null, error: null };
  const { value, error } = parseJsonObject(raw);
  if (error || !value) return { provided: true, value: null, error: error ?? 'Invalid JSON.' };
  return { provided: true, value, error: null };
}

/**
 * Assemble the request body for `POST /dollhouse-renders`, omitting any
 * optional sub-object that's empty so we satisfy the upstream's strict schema.
 */
export function buildCreateRenderBody(input: BuildCreateBodyInput): CreateDollhouseRenderBody {
  const body: CreateDollhouseRenderBody = {
    projectId: input.projectId,
    cameraFrames: input.cameraFrames,
    designMaterials: input.designMaterials,
    imageConfig: buildImageConfig(input.imageConfig),
    roomData: input.roomData,
  };
  const renderConfig = buildRenderConfig(input.renderConfig);
  if (renderConfig) body.renderConfig = renderConfig;
  const ssmParams = buildSsmParams(input.ssmParams);
  if (ssmParams) body.ssmParams = ssmParams;
  const cleanOverrides = input.styleOverrides.filter((o) => o.product.trim() && o.style.trim());
  if (cleanOverrides.length > 0) body.styleOverrides = cleanOverrides;
  return body;
}
