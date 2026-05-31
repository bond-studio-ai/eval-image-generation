"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DesignSettingsDisplay, useCatalogProducts } from "@/components/design-settings-editor";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { CopyIcon, PencilIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { localUrl, serviceUrl } from "@/lib/api-base";
import { getInputPresetStoredImages, INPUT_PRESET_DESIGN_FIELD_KEYS, INPUT_PRESET_SLOT_LABELS, INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY, readInputPresetValue } from "@/lib/input-preset-design";
import { INPUT_PRESET_RETAILER_ID } from "@/lib/input-preset-retailer";
import type { InputPresetDetailItem } from "@/lib/service-client";
import { RatingBadge } from "./rating-badge";

interface SerializedGeneration {
  id: string;
  sceneAccuracyRating: string | null;
  productAccuracyRating: string | null;
  createdAt: string;
  outputImageCount: number;
  promptVersionName: string | null;
}

interface Stats {
  generationCount: number;
  imageCount: number;
}

interface InputPresetDetailProps {
  data: InputPresetDetailItem;
  generations: SerializedGeneration[];
  stats: Stats;
}

interface LayoutPresetOption {
  id: string;
  name: string;
}

interface DesignPackageOption {
  id: string;
  title?: string | null;
  name?: string | null;
  style?: string | null;
}

function getDesignPackageLabel(option: DesignPackageOption | null, pkgId: string | null): string | null {
  if (!pkgId) return null;
  if (!option) return pkgId;
  return option.title?.trim() || option.name?.trim() || pkgId;
}

interface RawInputPresetData {
  layout_type_id?: unknown;
  pkg_id?: unknown;
  dollhouse_view?: unknown;
  real_photo?: unknown;
  mood_board?: unknown;
  [key: string]: unknown;
}

export function InputPresetDetail({ data, generations, stats }: InputPresetDetailProps) {
  const router = useRouter();
  const [cloning, setCloning] = useState(false);
  const rawData = data as unknown as RawInputPresetData;
  const { byId, loaded } = useCatalogProducts(INPUT_PRESET_RETAILER_ID);
  const storedImages = useMemo(() => getInputPresetStoredImages(rawData), [rawData]);
  const storedImagesBySlot = useMemo(() => new Map(storedImages.map((image) => [image.slot, image])), [storedImages]);
  const productCards = useMemo(() => {
    const imageTypeLabels: Record<string, string> = {
      "featured-image": "Featured Image",
      "line-drawing": "Line Drawing",
      "tear-sheet": "Tear Sheet",
      arbitrary: "Arbitrary"
    };

    return Object.keys(INPUT_PRESET_SLOT_TO_LEGACY_URL_KEY).flatMap((slot) => {
      const storedImage = storedImagesBySlot.get(slot) ?? null;
      const slotValue = readInputPresetValue(rawData, slot);
      const productId = typeof slotValue === "string" && slotValue.length > 0 ? slotValue : null;

      if (!productId && !storedImage) return [];

      const product = productId ? (byId.get(productId) ?? null) : null;
      const imageTypeValue = readInputPresetValue(rawData, `${slot}ImageType`);
      const imageTypeLabel = typeof imageTypeValue === "string" && imageTypeLabels[imageTypeValue] ? imageTypeLabels[imageTypeValue] : "Tear Sheet";

      return [
        {
          slot,
          label: INPUT_PRESET_SLOT_LABELS[slot] ?? slot,
          previewUrl: storedImage?.url ?? product?.featuredImage?.url ?? null,
          title: product?.name ?? (storedImage?.isArbitrary ? "Arbitrary image" : (productId ?? "Saved image")),
          subtitle: product ? `${product.category?.name ?? "Selected product"} · ${imageTypeLabel}` : storedImage?.isArbitrary ? `URL-only attachment · ${imageTypeLabel}` : imageTypeLabel,
          isLoadingPreview: Boolean(productId) && !product && !storedImage?.url && !loaded,
          url: storedImage?.url ?? null,
          isArbitrary: storedImage?.isArbitrary ?? false
        }
      ];
    });
  }, [byId, loaded, rawData, storedImagesBySlot]);
  const layoutTypeId = data.layoutTypeId ?? (typeof rawData.layout_type_id === "string" ? rawData.layout_type_id : null);
  const pkgId = data.pkgId ?? (typeof rawData.pkg_id === "string" ? rawData.pkg_id : null);

  const { data: layoutPresetOptions = [] } = useQuery({
    queryKey: ["layout-presets"],
    queryFn: async ({ signal }) => {
      const res = await fetch(serviceUrl("layout-presets"), { signal });
      if (!res.ok) throw new Error(`Failed to fetch presets (${res.status})`);
      const json = (await res.json()) as { data?: LayoutPresetOption[] };
      return Array.isArray(json.data) ? json.data : [];
    },
    enabled: Boolean(layoutTypeId)
  });

  const { data: designPackageOptions = [] } = useQuery({
    queryKey: ["design-packages", INPUT_PRESET_RETAILER_ID],
    queryFn: async ({ signal }) => {
      const url = new URL(localUrl("design-packages"), window.location.origin);
      url.searchParams.set("retailerId", INPUT_PRESET_RETAILER_ID);
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error(`Failed to fetch design packages (${res.status})`);
      const json = (await res.json()) as { data?: DesignPackageOption[] };
      return Array.isArray(json.data) ? json.data : [];
    },
    enabled: Boolean(pkgId)
  });

  const selectedLayoutPreset = useMemo(() => layoutPresetOptions.find((option) => option.id === layoutTypeId) ?? null, [layoutPresetOptions, layoutTypeId]);
  const selectedDesignPackage = useMemo(() => designPackageOptions.find((option) => option.id === pkgId) ?? null, [designPackageOptions, pkgId]);

  return (
    <div>
      <PageHeader
        backHref="/input-presets"
        backLabel="Back to Input Presets"
        title={data.name || "Untitled Input Preset"}
        subtitle={data.description}
        actions={
          data.deletedAt ? (
            <span className="bg-danger-50 text-danger-700 ring-danger-600/20 text-body inline-flex items-center rounded-full px-3 py-1 font-medium ring-1 ring-inset">Deleted</span>
          ) : (
            <>
              <Link
                href={`/input-presets/${data.id}/edit`}
                className="border-border-strong bg-surface text-text-secondary hover:bg-surface-muted text-body inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors"
              >
                <PencilIcon className="size-4" />
                Edit
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setCloning(true);
                  try {
                    const res = await fetch(serviceUrl(`input-presets/${data.id}/clone`), {
                      method: "POST"
                    });
                    if (!res.ok) throw new Error("Clone failed");
                    const json = await res.json();
                    const newId = json.data?.id;
                    if (newId) {
                      router.refresh();
                      router.push(`/input-presets/${newId}/edit`);
                    }
                  } finally {
                    setCloning(false);
                  }
                }}
                disabled={cloning}
                className="border-border-strong bg-surface text-text-secondary hover:bg-surface-muted text-body inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-medium transition-colors disabled:opacity-50"
              >
                {cloning ? <Spinner className="size-4" /> : <CopyIcon className="size-4" />}
                {cloning ? "Cloning..." : "Clone"}
              </button>
              <LinkButton href="/executions">New Run</LinkButton>
            </>
          )
        }
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Images</p>
          <p className="text-text-primary text-display mt-1">{stats.imageCount}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Generations</p>
          <p className="text-text-primary text-display mt-1">{stats.generationCount}</p>
        </div>
      </div>

      {layoutTypeId ? (
        <div className="border-border bg-surface mt-6 rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Room preset layout type</p>
          <p className="text-text-primary text-body mt-1">{selectedLayoutPreset?.name ?? layoutTypeId}</p>
        </div>
      ) : null}

      {pkgId ? (
        <div className="border-border bg-surface mt-6 rounded-lg border p-4 shadow-xs">
          <p className="text-text-secondary text-body font-medium">Design package</p>
          <p className="text-text-primary text-body mt-1">{getDesignPackageLabel(selectedDesignPackage, pkgId)}</p>
          {selectedDesignPackage?.style ? <p className="text-text-muted text-caption mt-1">{selectedDesignPackage.style}</p> : null}
        </div>
      ) : null}

      {/* Design settings (adapters_Design) */}
      {(() => {
        const entries = INPUT_PRESET_DESIGN_FIELD_KEYS.flatMap((key) => {
          const value = data[key];
          return value === undefined || value === null || value === "" ? [] : [[key, value] as const];
        });
        if (entries.length === 0) {
          return null;
        }
        return (
          <div className="mt-6">
            <DesignSettingsDisplay value={Object.fromEntries(entries)} hideProductFields />
          </div>
        );
      })()}

      {/* Scene Images */}
      {(() => {
        const scenes = [
          {
            label: "Dollhouse View",
            url: data.dollhouseView ?? (typeof rawData.dollhouse_view === "string" ? rawData.dollhouse_view : null)
          },
          {
            label: "Real Photo",
            url: data.realPhoto ?? (typeof rawData.real_photo === "string" ? rawData.real_photo : null)
          },
          {
            label: "Mood Board",
            url: data.moodBoard ?? (typeof rawData.mood_board === "string" ? rawData.mood_board : null)
          }
        ].filter((scene): scene is { label: string; url: string } => Boolean(scene.url));
        if (scenes.length === 0) return null;
        return (
          <div className="border-border bg-surface mt-6 rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body mb-4 font-semibold uppercase">Scene Images</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {scenes.map((scene) => (
                <div key={scene.label} className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
                  <div className="border-border-subtle border-b px-2.5 py-1.5">
                    <span className="text-text-secondary text-caption font-semibold">{scene.label}</span>
                  </div>
                  <ImageWithSkeleton src={scene.url} alt={scene.label} wrapperClassName="h-48 w-full bg-surface-muted p-1" />
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Product Images */}
      {(() => {
        return productCards.length > 0 ? (
          <div className="border-border bg-surface mt-6 rounded-lg border p-6 shadow-xs">
            <h2 className="text-text-primary text-body mb-4 font-semibold uppercase">Product Images</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {productCards.map((item) => (
                <div key={item.slot} className="border-border bg-surface overflow-hidden rounded-lg border shadow-xs">
                  {item.previewUrl ? (
                    <ImageWithSkeleton src={item.previewUrl} alt={item.label} wrapperClassName="h-32 w-full bg-surface-muted p-1" />
                  ) : item.isLoadingPreview ? (
                    <div className="bg-border h-32 w-full animate-pulse" aria-hidden />
                  ) : (
                    <div className="bg-surface-muted text-text-disabled text-caption flex h-32 items-center justify-center">No preview</div>
                  )}
                  <div className="border-border-subtle border-t px-2 py-1.5">
                    <p className="text-text-secondary text-caption truncate font-medium" title={item.label}>
                      {item.label}
                    </p>
                    <p className="text-text-secondary truncate text-[11px]" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-text-muted truncate text-[11px]" title={item.subtitle}>
                      {item.subtitle}
                    </p>
                    {item.url ? (
                      <p className="text-text-muted truncate text-[11px]" title={item.url}>
                        {item.url}
                      </p>
                    ) : null}
                    {item.isArbitrary ? <span className="bg-accent-100 text-accent-700 mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold">Arbitrary</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Generations List */}
      <div className="mt-8">
        <h2 className="text-text-primary text-h3">Generations</h2>
        {generations.length === 0 ? (
          <p className="text-text-secondary text-body mt-4">No generations yet using this input preset.</p>
        ) : (
          <div className="border-border bg-surface mt-4 overflow-hidden rounded-lg border shadow-xs">
            <table className="divide-border min-w-full divide-y">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Rating</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Prompt Version</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Outputs</th>
                  <th className="text-text-secondary text-caption px-6 py-3 text-left font-medium tracking-wider uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-border bg-surface divide-y">
                {generations.map((gen) => (
                  <tr key={gen.id} className="hover:bg-surface-muted">
                    <td className="text-body px-6 py-4 whitespace-nowrap">
                      <Link href={`/generations/${gen.id}`}>
                        <div className="flex gap-1">
                          <RatingBadge rating={gen.sceneAccuracyRating} label="Scene" />
                          <RatingBadge rating={gen.productAccuracyRating} label="Product" />
                        </div>
                      </Link>
                    </td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{gen.promptVersionName || "-"}</td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{gen.outputImageCount}</td>
                    <td className="text-text-secondary text-body px-6 py-4 whitespace-nowrap">{new Date(gen.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
