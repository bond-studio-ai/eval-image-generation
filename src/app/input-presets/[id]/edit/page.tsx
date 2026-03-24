import { fetchInputPresetById } from '@/lib/service-client';
import { PRODUCT_CATEGORIES } from '@/lib/validation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InputPresetEditForm } from './edit-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InputPresetEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const force = query.force === 'true';

  const presetData = await fetchInputPresetById(id).catch(() => null);
  if (!presetData) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preset = presetData as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = preset.stats as Record<string, any> | undefined;
  const generationCount = stats?.generationCount ?? stats?.generation_count ?? 0;

  if (generationCount > 0 && !force) {
    return (
      <div>
        <Link href={`/input-presets/${id}`} className="text-sm text-gray-600 hover:text-gray-900">
          &larr; Back to preset
        </Link>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">Cannot edit this preset</h2>
          <p className="mt-2 text-sm text-amber-800">
            This preset has been used in {generationCount} generation{generationCount !== 1 ? 's' : ''}. To change it, clone the preset first, then edit the copy.
          </p>
          <Link
            href={`/input-presets/${id}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Back to preset (use Clone there)
          </Link>
        </div>
      </div>
    );
  }

  const productImages: Record<string, string[]> = {};
  for (const key of PRODUCT_CATEGORIES) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    const val = preset[camelKey] ?? preset[key];
    const urls = Array.isArray(val) ? val.filter((v: unknown): v is string => typeof v === 'string' && !!v) : [];
    if (urls.length > 0) {
      productImages[key] = urls;
    }
  }

  const arbitraryImages = preset.arbitraryImages ?? preset.arbitrary_images;
  const designSettingsRaw = preset.designSettings ?? preset.design_settings;
  const designSettings =
    designSettingsRaw != null && typeof designSettingsRaw === 'object' && !Array.isArray(designSettingsRaw)
      ? (designSettingsRaw as Record<string, unknown>)
      : null;

  const initialData = {
    id: preset.id,
    name: preset.name ?? '',
    description: preset.description ?? '',
    dollhouseView: preset.dollhouseView ?? preset.dollhouse_view ?? null,
    realPhoto: preset.realPhoto ?? preset.real_photo ?? null,
    moodBoard: preset.moodBoard ?? preset.mood_board ?? null,
    productImages,
    arbitraryImages: Array.isArray(arbitraryImages)
      ? (arbitraryImages as { url: string; tag?: string }[]).map((a) => ({ url: a.url, tag: a.tag }))
      : [],
    designSettings,
  };

  return <InputPresetEditForm initialData={initialData} force={force} />;
}
