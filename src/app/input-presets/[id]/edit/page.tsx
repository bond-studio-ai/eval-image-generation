import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { LinkButton } from "@/components/ui/button";
import { getInputPresetStoredImages, INPUT_PRESET_DESIGN_FIELD_KEYS } from "@/lib/input-preset-design";
import { fetchInputPresetById } from "@/lib/service-client";
import { InputPresetEditForm } from "./edit-form";

export const metadata: Metadata = {
  title: "Edit Input Preset",
  description: "Edit an input preset used to seed strategy runs."
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InputPresetEditPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const force = query.force === "true";

  const presetData = await fetchInputPresetById(id).catch(() => null);
  if (!presetData) notFound();

  const preset = presetData as any;
  const stats = preset.stats as Record<string, any> | undefined;
  const generationCount = stats?.generationCount ?? stats?.generation_count ?? 0;

  if (generationCount > 0 && !force) {
    return (
      <div>
        <PageHeader backHref={`/input-presets/${id}`} backLabel="Back to preset" title="Cannot edit this preset" />
        <div className="border-warning-200 bg-warning-50 mt-6 rounded-lg border p-5">
          <p className="text-warning-800 text-body">
            This preset has been used in {generationCount} generation
            {generationCount !== 1 ? "s" : ""}. To change it, clone the preset first, then edit the copy.
          </p>
          <div className="mt-4">
            <LinkButton href={`/input-presets/${id}`}>Back to preset (use Clone there)</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  const designSettingsEntries = INPUT_PRESET_DESIGN_FIELD_KEYS.flatMap((key) => {
    const value = preset[key];
    return value === undefined || value === null || value === "" ? [] : [[key, value] as const];
  });
  const designSettings = designSettingsEntries.length > 0 ? Object.fromEntries(designSettingsEntries) : null;
  const storedImages = getInputPresetStoredImages(preset as Record<string, unknown>);
  const arbitraryImagesBySlot = Object.fromEntries(storedImages.flatMap((image) => (image.isArbitrary ? [[image.slot, image.url]] : [])));
  const savedImageUrlsBySlot = Object.fromEntries(storedImages.map((image) => [image.slot, image.url]));

  const initialData = {
    id: preset.id,
    name: preset.name ?? "",
    description: preset.description ?? "",
    layoutTypeId: preset.layoutTypeId ?? preset.layout_type_id ?? null,
    pkgId: preset.pkgId ?? preset.pkg_id ?? null,
    dollhouseView: preset.dollhouseView ?? preset.dollhouse_view ?? null,
    realPhoto: preset.realPhoto ?? preset.real_photo ?? null,
    moodBoard: preset.moodBoard ?? preset.mood_board ?? null,
    arbitraryImagesBySlot,
    designSettings,
    savedImageUrlsBySlot
  };

  return <InputPresetEditForm initialData={initialData} force={force} />;
}
