'use client';

import { ProductImageInput, type ProductImagesState } from '@/components/product-image-input';
import { SceneImageInput } from '@/components/scene-image-input';
import type { ImageSelectionRow, PromptVersionDetail, PromptVersionListItem } from '@/lib/queries';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface GenerationApiResult {
  generation_id: string;
  output_urls: string[];
  execution_time_ms: number;
  model: string;
  text_response?: string;
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// Map camelCase DB column names to snake_case UI keys
const CAMEL_TO_SNAKE: Record<string, string> = {
  robeHooks: 'robe_hooks',
  showerGlasses: 'shower_glasses',
  showerSystems: 'shower_systems',
  floorTiles: 'floor_tiles',
  wallTiles: 'wall_tiles',
  showerWallTiles: 'shower_wall_tiles',
  showerFloorTiles: 'shower_floor_tiles',
  showerCurbTiles: 'shower_curb_tiles',
  toiletPaperHolders: 'toilet_paper_holders',
  towelBars: 'towel_bars',
  towelRings: 'towel_rings',
  tubDoors: 'tub_doors',
  tubFillers: 'tub_fillers',
};

const PRODUCT_KEYS = [
  'faucets', 'lightings', 'lvps', 'mirrors', 'paints', 'robeHooks',
  'shelves', 'showerGlasses', 'showerSystems', 'floorTiles', 'wallTiles',
  'showerWallTiles', 'showerFloorTiles', 'showerCurbTiles',
  'toiletPaperHolders', 'toilets', 'towelBars', 'towelRings',
  'tubDoors', 'tubFillers', 'tubs', 'vanities', 'wallpapers',
];

function imageSelectionToState(d: ImageSelectionRow): {
  id: string;
  dollhouseView: string | null;
  realPhoto: string | null;
  productImages: ProductImagesState;
} {
  const prods: ProductImagesState = {};
  for (const k of PRODUCT_KEYS) {
    const val = (d as Record<string, unknown>)[k] as string | null | undefined;
    if (val) {
      const uiKey = CAMEL_TO_SNAKE[k] ?? k;
      prods[uiKey] = val;
    }
  }
  return {
    id: d.id,
    dollhouseView: d.dollhouseView,
    realPhoto: d.realPhoto,
    productImages: prods,
  };
}

export interface GeneratePageContentProps {
  initialPromptVersions: PromptVersionListItem[];
  initialImageSelection: ImageSelectionRow | null;
  initialPromptVersion: PromptVersionDetail | null;
  initialPromptVersionId: string | null;
}

export function GeneratePageContent({
  initialPromptVersions,
  initialImageSelection,
  initialPromptVersion,
  initialPromptVersionId,
}: GeneratePageContentProps) {
  const router = useRouter();

  // Prompt version list for selector (initialized from SSR)
  const [promptVersions, setPromptVersions] = useState<PromptVersionListItem[]>(initialPromptVersions);

  // Current prompt version (initialized from SSR if available)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(initialPromptVersionId);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [originalVersion, setOriginalVersion] = useState<PromptVersionDetail | null>(initialPromptVersion);

  // Editable prompt fields (initialized from SSR version if available)
  const [systemPrompt, setSystemPrompt] = useState(initialPromptVersion?.systemPrompt ?? '');
  const [userPrompt, setUserPrompt] = useState(initialPromptVersion?.userPrompt ?? '');
  const [model, setModel] = useState(initialPromptVersion?.model ?? 'gemini-2.5-flash-image');
  const [aspectRatio, setAspectRatio] = useState(initialPromptVersion?.aspectRatio ?? '1:1');
  const [outputResolution, setOutputResolution] = useState(initialPromptVersion?.outputResolution ?? '1K');
  const [temperature, setTemperature] = useState(initialPromptVersion?.temperature ?? '');
  const [numberOfImages, setNumberOfImages] = useState('1');
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GenerationApiResult | null>(null);
  const [notes, setNotes] = useState('');

  // Image selections state (initialized from SSR)
  const initialImageState = initialImageSelection ? imageSelectionToState(initialImageSelection) : null;
  const [dollhouseView, setDollhouseView] = useState<string | null>(initialImageState?.dollhouseView ?? null);
  const [realPhoto, setRealPhoto] = useState<string | null>(initialImageState?.realPhoto ?? null);
  const [productImages, setProductImages] = useState<ProductImagesState>(initialImageState?.productImages ?? {});
  const imageSelectionLoaded = useRef(true); // Already loaded from SSR

  // Active prompt version ID (the one that will be used for generation)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(initialPromptVersion?.id ?? null);

  // New version modal
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  // Use ref for runGeneration so createNewVersion always has the latest reference
  const runGenerationRef = useRef<(versionId: string) => Promise<void>>(undefined);

  // Build the input_images payload object
  const buildInputImagesPayload = useCallback((): Record<string, string | null> => {
    const payload: Record<string, string | null> = {};
    if (dollhouseView) payload.dollhouse_view = dollhouseView;
    if (realPhoto) payload.real_photo = realPhoto;
    for (const [key, url] of Object.entries(productImages)) {
      if (url) payload[key] = url;
    }
    return payload;
  }, [dollhouseView, realPhoto, productImages]);

  // Detect if prompt has been modified from the original version
  const isModified = useMemo(() => {
    if (!originalVersion) return systemPrompt.trim() !== '' || userPrompt.trim() !== '';
    return (
      systemPrompt !== originalVersion.systemPrompt ||
      userPrompt !== originalVersion.userPrompt ||
      model !== (originalVersion.model ?? '') ||
      aspectRatio !== (originalVersion.aspectRatio ?? '') ||
      outputResolution !== (originalVersion.outputResolution ?? '') ||
      temperature !== (originalVersion.temperature ?? '')
    );
  }, [originalVersion, systemPrompt, userPrompt, model, aspectRatio, outputResolution, temperature]);

  // Check if the selected version is locked (has generations)
  const isLocked = useMemo(() => {
    return originalVersion?.stats?.generation_count !== undefined && originalVersion.stats.generation_count > 0;
  }, [originalVersion]);

  // Auto-save image selections when they change
  useEffect(() => {
    if (!imageSelectionLoaded.current) return;

    const payload: Record<string, string | null> = {
      dollhouse_view: dollhouseView,
      real_photo: realPhoto,
    };
    for (const [key, url] of Object.entries(productImages)) {
      // Keys are already in snake_case from the UI state
      payload[key] = url;
    }

    const timer = setTimeout(() => {
      fetch('/api/v1/image-selections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .catch(() => { /* ignore */ });
    }, 500);

    return () => clearTimeout(timer);
  }, [dollhouseView, realPhoto, productImages]);

  // Load selected prompt version when changed via dropdown (not initial load)
  useEffect(() => {
    // Skip the initial mount -- SSR already provided the data
    if (selectedVersionId === initialPromptVersionId) return;

    if (!selectedVersionId) {
      setOriginalVersion(null);
      setLoadingVersion(false);
      return;
    }

    setLoadingVersion(true);
    fetch(`/api/v1/prompt-versions/${selectedVersionId}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data) {
          const pv = r.data as PromptVersionDetail;
          setOriginalVersion(pv);
          setSystemPrompt(pv.systemPrompt);
          setUserPrompt(pv.userPrompt);
          setModel(pv.model ?? 'gemini-2.5-flash-image');
          setAspectRatio(pv.aspectRatio ?? '1:1');
          setOutputResolution(pv.outputResolution ?? '1K');
          setTemperature(pv.temperature ?? '');
          setActiveVersionId(pv.id);
          // Reset generation state when switching versions
          setGenerationResult(null);
          setNotes('');
          setGenerationError(null);
        }
        setLoadingVersion(false);
      })
      .catch(() => setLoadingVersion(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersionId]);

  const handleVersionSelect = (id: string) => {
    setSelectedVersionId(id || null);
    if (!id) {
      setOriginalVersion(null);
      setSystemPrompt('');
      setUserPrompt('');
      setModel('gemini-2.5-flash-image');
      setAspectRatio('1:1');
      setOutputResolution('1K');
      setTemperature('');
      setActiveVersionId(null);
      setGenerationResult(null);
      setNotes('');
      setGenerationError(null);
    }
  };

  const runGeneration = useCallback(
    async (versionId: string) => {
      setGenerating(true);
      setGenerationResult(null);
      setGenerationError(null);

      try {
        const inputPayload = buildInputImagesPayload();

        const numImages = parseInt(numberOfImages, 10);
        const res = await fetch('/api/v1/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_version_id: versionId,
            input_images: inputPayload,
            ...(numImages > 1 && { number_of_images: numImages }),
            ...(useGoogleSearch && { use_google_search: true }),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setGenerationError(data.error?.message || `Generation failed (${res.status})`);
          return;
        }

        if (data.data) {
          setGenerationResult(data.data as GenerationApiResult);
        } else {
          setGenerationError('Unexpected response from generation API.');
        }
      } catch (error) {
        console.error('Generation error:', error);
        setGenerationError('Network error -- could not reach the generation API.');
      } finally {
        setGenerating(false);
      }
    },
    [buildInputImagesPayload, numberOfImages, useGoogleSearch],
  );

  // Keep the ref in sync so createNewVersion always uses the latest
  runGenerationRef.current = runGeneration;

  // Create new prompt version from modified prompt
  const createNewVersion = useCallback(async () => {
    if (!newVersionName.trim()) return;

    setCreatingVersion(true);
    setVersionError(null);

    try {
      const res = await fetch('/api/v1/prompt-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVersionName.trim(),
          description: newVersionDescription.trim() || undefined,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          model: model || undefined,
          aspect_ratio: aspectRatio || undefined,
          output_resolution: outputResolution || undefined,
          temperature: temperature ? Number(temperature) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setVersionError(data.error?.message || 'Failed to create prompt version.');
        return;
      }

      if (data.data?.id) {
        const newId = data.data.id;
        setActiveVersionId(newId);
        setSelectedVersionId(newId);
        setOriginalVersion({
          id: newId,
          name: newVersionName.trim() || null,
          description: newVersionDescription.trim(),
          systemPrompt,
          userPrompt,
          model: model || null,
          aspectRatio: aspectRatio || null,
          outputResolution: outputResolution || null,
          temperature: temperature || null,
          stats: { generation_count: 0 },
        });
        setPromptVersions((prev) => [
          {
            id: newId,
            name: newVersionName.trim() || null,
            systemPrompt,
            userPrompt,
            model: model || null,
            aspectRatio: aspectRatio || null,
            outputResolution: outputResolution || null,
            temperature: temperature || null,
            stats: { generation_count: 0 },
          },
          ...prev,
        ]);
        setShowNewVersionModal(false);
        setNewVersionName('');
        setNewVersionDescription('');

        // Proceed with generation using the latest runGeneration via ref
        await runGenerationRef.current?.(newId);
      }
    } catch (error) {
      console.error('Error creating version:', error);
      setVersionError('Network error -- could not create prompt version.');
    } finally {
      setCreatingVersion(false);
    }
  }, [newVersionName, newVersionDescription, systemPrompt, userPrompt, model, aspectRatio, outputResolution, temperature]);

  const handleGenerate = useCallback(async () => {
    if (!systemPrompt.trim() || !userPrompt.trim()) return;

    // If prompts are modified (or no original version), need to create a new version first
    if (isModified || !activeVersionId) {
      setShowNewVersionModal(true);
      return;
    }

    // Use existing version
    await runGeneration(activeVersionId);
  }, [systemPrompt, userPrompt, isModified, activeVersionId, runGeneration]);

  const handleSave = useCallback(async () => {
    if (!activeVersionId || !generationResult?.generation_id) return;
    setSaving(true);
    setSaveError(null);

    try {
      const genId = generationResult.generation_id;

      // Update notes via PATCH if provided
      if (notes) {
        const patchRes = await fetch(`/api/v1/generations/${genId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json();
          setSaveError(d.error?.message || 'Failed to update notes.');
          return;
        }
      }

      router.push(`/generations/${genId}`);
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('Network error -- could not save generation.');
    } finally {
      setSaving(false);
    }
  }, [activeVersionId, generationResult, notes, router]);

  // Computed: output images from API generation
  const allOutputImages = useMemo(() => {
    return generationResult?.output_urls?.map((url, i) => ({
      url,
      label: `Generated #${i + 1}`,
    })) ?? [];
  }, [generationResult]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Image</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select a prompt version or write a new prompt, then generate and evaluate.
        </p>
      </div>

      {/* Prompt Version Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <label htmlFor="version-select" className="mb-2 block text-sm font-semibold text-gray-900 uppercase">
          Prompt Version
        </label>
        <div className="relative">
          <select
            id="version-select"
            value={selectedVersionId ?? ''}
            onChange={(e) => handleVersionSelect(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500"
            disabled={loadingVersion}
          >
            <option value="">-- Start from scratch --</option>
            {promptVersions.map((pv) => (
              <option key={pv.id} value={pv.id}>
                {pv.name || 'Untitled'} {pv.stats?.generation_count ? `(${pv.stats.generation_count} generations)` : ''}
              </option>
            ))}
          </select>
          {loadingVersion && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        {loadingVersion && (
          <p className="mt-2 text-xs text-gray-500">Loading version details...</p>
        )}
        {isLocked && !loadingVersion && (
          <p className="mt-2 text-xs text-amber-600">
            This version has been used in generations and is locked. Editing the prompt will create a new version.
          </p>
        )}
        {isModified && originalVersion && !loadingVersion && (
          <p className="mt-2 text-xs text-blue-600">
            Prompt modified from original. A new version will be created when you generate.
          </p>
        )}
      </div>

      {/* Editable Prompts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <label htmlFor="system-prompt" className="mb-2 block text-sm font-semibold text-gray-900 uppercase">
            System Prompt
          </label>
          <textarea
            id="system-prompt"
            rows={8}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter the system prompt..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <label htmlFor="user-prompt" className="mb-2 block text-sm font-semibold text-gray-900 uppercase">
            User Prompt
          </label>
          <textarea
            id="user-prompt"
            rows={8}
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Enter the user prompt..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
          />
        </div>
      </div>

      {/* Model Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Model Settings</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <label htmlFor="model" className="mb-1 block text-xs font-medium text-gray-600">Model</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            >
              <option value="gemini-2.5-flash-image">Nano Banana</option>
              <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
            </select>
          </div>
          <div>
            <label htmlFor="aspect-ratio" className="mb-1 block text-xs font-medium text-gray-600">Aspect Ratio</label>
            <select
              id="aspect-ratio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="2:3">2:3 (Portrait)</option>
              <option value="3:2">3:2 (Landscape)</option>
              <option value="3:4">3:4 (Portrait)</option>
              <option value="4:3">4:3 (Landscape)</option>
              <option value="4:5">4:5 (Portrait)</option>
              <option value="5:4">5:4 (Landscape)</option>
              <option value="9:16">9:16 (Tall Portrait)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="21:9">21:9 (Ultra-wide)</option>
            </select>
          </div>
          <div>
            <label htmlFor="resolution" className="mb-1 block text-xs font-medium text-gray-600">Resolution</label>
            <select
              id="resolution"
              value={outputResolution}
              onChange={(e) => setOutputResolution(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </div>
          <div>
            <label htmlFor="temperature" className="mb-1 block text-xs font-medium text-gray-600">Temperature</label>
            <input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="0.0 – 2.0"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="num-images" className="mb-1 block text-xs font-medium text-gray-600"># of Images</label>
            <select
              id="num-images"
              value={numberOfImages}
              onChange={(e) => setNumberOfImages(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="google-search"
            type="checkbox"
            checked={useGoogleSearch}
            onChange={(e) => setUseGoogleSearch(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="google-search" className="text-xs font-medium text-gray-600">
            Grounding with Google Search
          </label>
        </div>
      </div>

      {/* Scene Images */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Scene Images</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SceneImageInput
            label="Dollhouse View"
            value={dollhouseView}
            onChange={setDollhouseView}
          />
          <SceneImageInput
            label="Real Photo"
            value={realPhoto}
            onChange={setRealPhoto}
          />
        </div>
      </div>

      {/* Product Images */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">Product Images</h2>
        <ProductImageInput
          value={productImages}
          onChange={setProductImages}
        />
      </div>

      {/* Generate */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Run Generation
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          This will call the Gemini API with the prompt and images above.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating || !systemPrompt.trim() || !userPrompt.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {generating ? (
            <>
              <Spinner />
              Generating...
            </>
          ) : (
            'Generate Image'
          )}
        </button>

        {/* Generation error */}
        {generationError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Generation failed</p>
            <p className="mt-1 text-sm text-red-700">{generationError}</p>
          </div>
        )}

        {/* Generation results */}
        {generationResult && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Success
              </span>
              <span className="text-xs text-gray-500">
                {(generationResult.execution_time_ms / 1000).toFixed(1)}s | {generationResult.model}
              </span>
            </div>

            {generationResult.text_response && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-600 uppercase">Text Response</p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700">{generationResult.text_response}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output Images */}
      {allOutputImages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
            Output Images
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {allOutputImages.map((img, idx) => (
              <div key={idx} className="overflow-hidden rounded-lg border border-gray-200 shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.label} className="h-56 w-full object-contain bg-gray-50" />
                <div className="p-2">
                  <p className="truncate text-xs text-gray-600">{img.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes & Save */}
      {generationResult && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
            Save Generation
          </h2>
          <div className="mb-4">
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations or notes about this generation..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {saving ? (
              <>
                <Spinner />
                Saving...
              </>
            ) : (
              'Save Generation'
            )}
          </button>
          {saveError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}
        </div>
      )}

      {/* New Version Modal */}
      {showNewVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Create New Prompt Version</h3>
            <p className="mt-1 text-sm text-gray-600">
              {originalVersion
                ? 'You\'ve modified the prompt. A new version will be created before generating.'
                : 'A prompt version will be created to track this generation.'}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="version-name" className="mb-1 block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="version-name"
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="e.g. v2 - improved lighting"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                />
              </div>
              <div>
                <label htmlFor="version-desc" className="mb-1 block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  id="version-desc"
                  rows={3}
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  placeholder="Describe what changed or what this version is for..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
                />
              </div>
            </div>

            {versionError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{versionError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewVersionModal(false);
                  setNewVersionName('');
                  setNewVersionDescription('');
                  setVersionError(null);
                }}
                disabled={creatingVersion}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createNewVersion}
                disabled={!newVersionName.trim() || creatingVersion}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
              >
                {creatingVersion ? (
                  <>
                    <Spinner />
                    Creating...
                  </>
                ) : (
                  'Create & Generate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
