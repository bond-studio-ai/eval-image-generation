'use client';

import { buildDesignMaterials, type UnitySlimDesignMaterials } from './design-materials';
import { localUrl, serviceUrl } from './api-base';
import {
  INPUT_PRESET_DESIGN_FIELD_KEYS,
  INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY,
  readInputPresetValue,
} from './input-preset-design';

export type StrategyRunInputPayload = {
  layout_type_id?: string | null;
  pkg_id?: string | null;
  scene_images: {
    dollhouse_view?: string;
    real_photo?: string;
    mood_board?: string;
  };
  product_images: Record<string, string[]>;
  arbitrary_images: Array<{ url: string; slot?: string; tag?: string }>;
  design: Record<string, unknown>;
};

export type StrategyRunDollhouseCapturePayload = {
  project_id: string;
  room_data: Record<string, unknown>;
  design_materials: UnitySlimDesignMaterials;
  image_config?: {
    width?: number;
    height?: number;
    format?: string;
  };
};

export type CreateStrategyRunRequest = Omit<StrategyRunInputPayload, 'pkg_id'> & {
  preset_id?: string;
  batch?: boolean;
  number_of_images: number;
  callback_url?: string;
  dollhouse_capture?: StrategyRunDollhouseCapturePayload;
  group_id?: string;
};

type LayoutBootstrapResponse = {
  project_id: string;
  room_data: Record<string, unknown>;
};

type UpsertProjectDesignResponse = {
  room_data: Record<string, unknown>;
  design?: Record<string, unknown>;
};

function readUrl(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string' && entry.length > 0) ?? null;
  }
  return null;
}

export function buildStrategyRunInputFromPreset(data: Record<string, unknown>): StrategyRunInputPayload {
  const scene_images: StrategyRunInputPayload['scene_images'] = {};
  const dollhouseView = readInputPresetValue(data, 'dollhouseView');
  const realPhoto = readInputPresetValue(data, 'realPhoto');
  const moodBoard = readInputPresetValue(data, 'moodBoard');
  if (typeof dollhouseView === 'string' && dollhouseView) scene_images.dollhouse_view = dollhouseView;
  if (typeof realPhoto === 'string' && realPhoto) scene_images.real_photo = realPhoto;
  if (typeof moodBoard === 'string' && moodBoard) scene_images.mood_board = moodBoard;

  const product_images: Record<string, string[]> = {};
  const arbitrary_images: StrategyRunInputPayload['arbitrary_images'] = [];
  for (const [slot, urlKey] of Object.entries(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY)) {
    const url = readUrl(readInputPresetValue(data, urlKey));
    if (!url) continue;
    const slotValue = readInputPresetValue(data, slot);
    const categoryKey = urlKey.replace(/_url$/, '');
    const imageType = readInputPresetValue(data, `${slot}ImageType`);

    if (imageType === 'arbitrary') {
      arbitrary_images.push({ url, slot, tag: slot });
      const existing = product_images[categoryKey] ?? [];
      if (!existing.includes(url)) product_images[categoryKey] = [...existing, url];
      continue;
    }

    if (typeof slotValue === 'string' && slotValue.length > 0 && imageType !== 'arbitrary') {
      continue;
    }

    const existing = product_images[categoryKey] ?? [];
    if (!existing.includes(url)) product_images[categoryKey] = [...existing, url];
  }

  const design: Record<string, unknown> = {};
  for (const key of INPUT_PRESET_DESIGN_FIELD_KEYS) {
    const value = readInputPresetValue(data, key);
    if (value !== undefined) design[key] = value;
  }

  const layoutTypeId = readInputPresetValue(data, 'layoutTypeId');
  const pkgId = readInputPresetValue(data, 'pkgId');
  return {
    ...(typeof layoutTypeId === 'string' || layoutTypeId === null
      ? { layout_type_id: layoutTypeId as string | null }
      : {}),
    ...(typeof pkgId === 'string' || pkgId === null ? { pkg_id: pkgId as string | null } : {}),
    scene_images,
    product_images,
    arbitrary_images,
    design,
  };
}

async function bootstrapLayoutPreset(
  layoutTypeId: string,
  pkgId: string,
): Promise<LayoutBootstrapResponse> {
  const res = await fetch(localUrl('layout-presets/bootstrap'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout_type_id: layoutTypeId, pkg_id: pkgId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: { message?: string } }).error?.message || 'Failed to bootstrap layout preset',
    );
  }
  return (json as { data?: LayoutBootstrapResponse }).data as LayoutBootstrapResponse;
}

async function upsertProjectDesign(
  projectId: string,
  design: Record<string, unknown>,
): Promise<UpsertProjectDesignResponse> {
  const res = await fetch(localUrl(`projects/${projectId}/design`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (json as { error?: { message?: string } }).error?.message || 'Failed to persist project design',
    );
  }
  return (json as { data?: UpsertProjectDesignResponse }).data as UpsertProjectDesignResponse;
}

export async function buildPresetRunRequest(
  input: StrategyRunInputPayload,
  options: { preset_id: string; number_of_images: number; batch?: boolean; group_id?: string },
): Promise<CreateStrategyRunRequest> {
  let dollhouseCapture: StrategyRunDollhouseCapturePayload | undefined;
  if (!input.scene_images.dollhouse_view && input.layout_type_id) {
    if (!input.pkg_id) {
      throw new Error(`Preset ${options.preset_id} has layout_type_id but no pkg_id`);
    }
    const bootstrap = await bootstrapLayoutPreset(input.layout_type_id, input.pkg_id);
    const persisted = await upsertProjectDesign(bootstrap.project_id, input.design);
    const designMaterials = await buildDesignMaterials({
      design: input.design,
      roomData: persisted.room_data,
      projectId: bootstrap.project_id,
    });
    if (!designMaterials) {
      throw new Error('Failed to build design materials from preset layout');
    }
    dollhouseCapture = {
      project_id: bootstrap.project_id,
      room_data: persisted.room_data,
      design_materials: designMaterials,
    };
  }

  return {
    layout_type_id: input.layout_type_id,
    scene_images: input.scene_images,
    product_images: input.product_images,
    arbitrary_images: input.arbitrary_images,
    design: input.design,
    preset_id: options.preset_id,
    number_of_images: options.number_of_images,
    ...(options.batch !== undefined ? { batch: options.batch } : {}),
    ...(options.group_id ? { group_id: options.group_id } : {}),
    ...(dollhouseCapture ? { dollhouse_capture: dollhouseCapture } : {}),
  };
}

export async function fetchPresetRunInputs(presetIds: string[]): Promise<StrategyRunInputPayload[]> {
  const presetDetails = await Promise.all(
    presetIds.map(async (presetId) => {
      const res = await fetch(serviceUrl(`input-presets/${presetId}`), { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message || 'Failed to load preset details',
        );
      }
      return (json as { data?: Record<string, unknown> }).data ?? {};
    }),
  );

  return presetDetails.map((detail) => buildStrategyRunInputFromPreset(detail));
}

export async function fetchPresetRunRequests(
  presetIds: string[],
  options: { number_of_images: number; batch?: boolean; group_id?: string },
): Promise<CreateStrategyRunRequest[]> {
  const presetDetails = await Promise.all(
    presetIds.map(async (presetId) => {
      const res = await fetch(serviceUrl(`input-presets/${presetId}`), { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message || 'Failed to load preset details',
        );
      }
      return { presetId, detail: (json as { data?: Record<string, unknown> }).data ?? {} };
    }),
  );

  return Promise.all(
    presetDetails.map(({ presetId, detail }) =>
      buildPresetRunRequest(buildStrategyRunInputFromPreset(detail), { ...options, preset_id: presetId }),
    ),
  );
}
