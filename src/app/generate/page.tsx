'use client';

import { ImageUpload } from '@/components/image-upload';
import { GeneratePageSkeleton } from '@/components/loading-state';
import { ProductPicker, type SelectedProduct } from '@/components/product-picker';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface PromptVersion {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  description: string | null;
  model: string | null;
  outputType: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
  stats?: {
    generation_count: number;
  };
}

interface PromptVersionListItem {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  model: string | null;
  outputType: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
  stats?: {
    generation_count: number;
  };
}

interface UploadedImage {
  url: string;
  name: string;
  previewUrl: string;
}

interface MockResult {
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function GeneratePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPromptVersionId = searchParams.get('prompt_version_id');

  // Prompt version list for selector
  const [promptVersions, setPromptVersions] = useState<PromptVersionListItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);

  // Current prompt version (if loaded from existing)
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(initialPromptVersionId);
  const [loadingVersion, setLoadingVersion] = useState(!!initialPromptVersionId);
  const [originalVersion, setOriginalVersion] = useState<PromptVersion | null>(null);

  // Editable prompt fields
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [model, setModel] = useState('');
  const [outputType, setOutputType] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [outputResolution, setOutputResolution] = useState('');
  const [temperature, setTemperature] = useState('');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mockResult, setMockResult] = useState<MockResult | null>(null);
  const [inputImages, setInputImages] = useState<UploadedImage[]>([]);
  const [productImages, setProductImages] = useState<SelectedProduct[]>([]);
  const [outputImages, setOutputImages] = useState<UploadedImage[]>([]);
  const [notes, setNotes] = useState('');

  // New version modal
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);

  // Active prompt version ID (the one that will be used for generation)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Use ref for runGeneration so createNewVersion always has the latest reference
  const runGenerationRef = useRef<(versionId: string) => Promise<void>>(undefined);

  // Detect if prompt has been modified from the original version
  const isModified = useMemo(() => {
    if (!originalVersion) return systemPrompt.trim() !== '' || userPrompt.trim() !== '';
    return (
      systemPrompt !== originalVersion.systemPrompt ||
      userPrompt !== originalVersion.userPrompt ||
      model !== (originalVersion.model ?? '') ||
      outputType !== (originalVersion.outputType ?? '') ||
      aspectRatio !== (originalVersion.aspectRatio ?? '') ||
      outputResolution !== (originalVersion.outputResolution ?? '') ||
      temperature !== (originalVersion.temperature ?? '')
    );
  }, [originalVersion, systemPrompt, userPrompt, model, outputType, aspectRatio, outputResolution, temperature]);

  // Check if the selected version is locked (has generations)
  const isLocked = useMemo(() => {
    return originalVersion?.stats?.generation_count !== undefined && originalVersion.stats.generation_count > 0;
  }, [originalVersion]);

  // Load prompt versions list
  useEffect(() => {
    fetch('/api/v1/prompt-versions?limit=100')
      .then((r) => r.json())
      .then((r) => {
        setPromptVersions(r.data || []);
        setLoadingVersions(false);
      })
      .catch(() => setLoadingVersions(false));
  }, []);

  // Load selected prompt version
  useEffect(() => {
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
          const pv = r.data as PromptVersion;
          setOriginalVersion(pv);
          setSystemPrompt(pv.systemPrompt);
          setUserPrompt(pv.userPrompt);
          setModel(pv.model ?? '');
          setOutputType(pv.outputType ?? '');
          setAspectRatio(pv.aspectRatio ?? '');
          setOutputResolution(pv.outputResolution ?? '');
          setTemperature(pv.temperature ?? '');
          setActiveVersionId(pv.id);
          // Reset generation state when switching versions
          setMockResult(null);
          setOutputImages([]);
          setNotes('');
          setGenerationError(null);
        }
        setLoadingVersion(false);
      })
      .catch(() => setLoadingVersion(false));
  }, [selectedVersionId]);

  const handleVersionSelect = (id: string) => {
    setSelectedVersionId(id || null);
    if (!id) {
      setOriginalVersion(null);
      setSystemPrompt('');
      setUserPrompt('');
      setModel('');
      setOutputType('');
      setAspectRatio('');
      setOutputResolution('');
      setTemperature('');
      setActiveVersionId(null);
      setMockResult(null);
      setOutputImages([]);
      setNotes('');
      setGenerationError(null);
    }
  };

  const runGeneration = useCallback(
    async (versionId: string) => {
      setGenerating(true);
      setMockResult(null);
      setGenerationError(null);

      try {
        // Combine uploaded input images and product images
        const allInputImageUrls = [
          ...inputImages.map((img) => img.url),
          ...productImages.map((p) => p.imageUrl),
        ];

        const res = await fetch('/api/v1/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt_version_id: versionId,
            input_images: allInputImageUrls,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setGenerationError(data.error?.message || `Generation failed (${res.status})`);
          return;
        }

        if (data.data) {
          setMockResult(data.data);
        } else {
          setGenerationError('Unexpected response from generation API.');
        }
      } catch (error) {
        console.error('Generation error:', error);
        setGenerationError('Network error — could not reach the generation API.');
      } finally {
        setGenerating(false);
      }
    },
    [inputImages, productImages],
  );

  // Keep the ref in sync so createNewVersion always uses the latest
  runGenerationRef.current = runGeneration;

  // Create new prompt version from modified prompt
  const createNewVersion = useCallback(async () => {
    if (!newVersionDescription.trim()) return;

    setCreatingVersion(true);
    setVersionError(null);

    try {
      const res = await fetch('/api/v1/prompt-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVersionName.trim() || undefined,
          description: newVersionDescription.trim(),
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          model: model || undefined,
          output_type: outputType || undefined,
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
          outputType: outputType || null,
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
            outputType: outputType || null,
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
      setVersionError('Network error — could not create prompt version.');
    } finally {
      setCreatingVersion(false);
    }
  }, [newVersionName, newVersionDescription, systemPrompt, userPrompt, model, outputType, aspectRatio, outputResolution, temperature]);

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
    if (!activeVersionId || !mockResult) return;
    setSaving(true);
    setSaveError(null);

    try {
      const executionTime =
        typeof mockResult.response === 'object' && mockResult.response !== null
          ? (mockResult.response as Record<string, unknown>).execution_time_ms
          : undefined;

      // Combine uploaded input images and product images
      const allInputImages = [
        ...inputImages.map((img) => ({ url: img.url })),
        ...productImages.map((p) => ({ url: p.imageUrl })),
      ];

      const res = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_version_id: activeVersionId,
          input_images: allInputImages,
          output_images: outputImages.map((img) => ({ url: img.url })),
          notes: notes || undefined,
          execution_time: typeof executionTime === 'number' ? Math.round(executionTime) : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error?.message || 'Failed to save generation.');
        return;
      }

      if (data.data?.id) {
        router.push(`/generations/${data.data.id}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveError('Network error — could not save generation.');
    } finally {
      setSaving(false);
    }
  }, [activeVersionId, mockResult, inputImages, productImages, outputImages, notes, router]);

  // Full-page loading when a version is being loaded on initial mount
  if (loadingVersion && !originalVersion) {
    return <GeneratePageSkeleton />;
  }

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
            disabled={loadingVersions || loadingVersion}
          >
            <option value="">-- Start from scratch --</option>
            {promptVersions.map((pv) => (
              <option key={pv.id} value={pv.id}>
                {pv.name || 'Untitled'} {pv.stats?.generation_count ? `(${pv.stats.generation_count} generations)` : ''}
              </option>
            ))}
          </select>
          {(loadingVersions || loadingVersion) && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Spinner className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        {loadingVersions && (
          <p className="mt-2 text-xs text-gray-500">Loading prompt versions...</p>
        )}
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
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gpt-image-1"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="output-type" className="mb-1 block text-xs font-medium text-gray-600">Output Type</label>
            <input
              id="output-type"
              type="text"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
              placeholder="e.g. image"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="aspect-ratio" className="mb-1 block text-xs font-medium text-gray-600">Aspect Ratio</label>
            <input
              id="aspect-ratio"
              type="text"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              placeholder="e.g. 16:9"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="resolution" className="mb-1 block text-xs font-medium text-gray-600">Resolution</label>
            <input
              id="resolution"
              type="text"
              value={outputResolution}
              onChange={(e) => setOutputResolution(e.target.value)}
              placeholder="e.g. 1024x1024"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
          <div>
            <label htmlFor="temperature" className="mb-1 block text-xs font-medium text-gray-600">Temperature</label>
            <input
              id="temperature"
              type="text"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="e.g. 0.7"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-1"
            />
          </div>
        </div>
      </div>

      {/* Input Images */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Input Images (Optional)
        </h2>
        <ImageUpload
          label="Upload reference / input images"
          images={inputImages}
          onImagesChange={setInputImages}
          maxImages={5}
        />
      </div>

      {/* Product Images */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Product Images
        </h2>
        <ProductPicker
          selectedProducts={productImages}
          onProductsChange={setProductImages}
        />
      </div>

      {/* Generate */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Run Generation (Mock)
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          This will simulate an API call to the AI image generation service with the prompt above.
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

        {/* Mock API Request/Response */}
        {mockResult && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold text-gray-600 uppercase">API Request</h3>
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(mockResult.request, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-gray-600 uppercase">API Response</h3>
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(mockResult.response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Upload Output Images */}
      {mockResult && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
            Upload Output Images
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Upload the generated images for evaluation. In mock mode, upload images that represent
            what the AI service would have produced.
          </p>
          <ImageUpload
            label="Upload generated / output images"
            images={outputImages}
            onImagesChange={setOutputImages}
            maxImages={10}
          />
        </div>
      )}

      {/* Notes & Save */}
      {mockResult && (
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
            disabled={saving || outputImages.length === 0}
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
          {outputImages.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Upload at least one output image before saving.
            </p>
          )}
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
                  Name (optional)
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
                  Description <span className="text-red-500">*</span>
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
                disabled={!newVersionDescription.trim() || creatingVersion}
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

export default function GeneratePage() {
  return (
    <Suspense fallback={<GeneratePageSkeleton />}>
      <GeneratePageContent />
    </Suspense>
  );
}
