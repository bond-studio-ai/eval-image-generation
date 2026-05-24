import type {
  CreateDollhouseRenderBody,
  DollhouseCameraFrame,
  DollhouseImageConfig,
  DollhouseRenderConfig,
  DollhouseRenderMode,
  DollhouseSsmParams,
  DollhouseStyleOverride,
  UnitySlimDesignMaterials,
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
  { value: 'Jpeg', label: 'JPEG' },
  { value: 'Png', label: 'PNG' },
  { value: 'Exr', label: 'EXR' },
];

export const RENDER_MODE_OPTIONS: { value: RenderModeOption; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'STANDARD_LIT', label: 'Standard Lit' },
  { value: 'LINEWORK', label: 'Linework' },
  { value: 'COLORIZED_LINEWORK', label: 'Colorized Linework' },
];

export const DEFAULT_IMAGE_CONFIG: ImageConfigState = {
  format: 'Jpeg',
  width: '1024',
  height: '1024',
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
    width: Number.isFinite(width) && width > 0 ? width : 1024,
    height: Number.isFinite(height) && height > 0 ? height : 1024,
    ...(ssm !== null && Number.isFinite(ssm) && ssm > 0 ? { superSamplingMultiplier: ssm } : {}),
  };
}

export function buildRenderConfig(state: RenderConfigState): DollhouseRenderConfig | undefined {
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

export function buildSsmParams(state: SsmParamsState): DollhouseSsmParams | undefined {
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
