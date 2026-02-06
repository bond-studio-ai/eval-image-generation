'use client';

import { ImageUpload } from '@/components/image-upload';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface PromptVersion {
  id: string;
  name: string | null;
  systemPrompt: string;
  userPrompt: string;
  model: string | null;
  outputType: string | null;
  aspectRatio: string | null;
  outputResolution: string | null;
  temperature: string | null;
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

export default function GeneratePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [promptVersion, setPromptVersion] = useState<PromptVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mockResult, setMockResult] = useState<MockResult | null>(null);
  const [inputImages, setInputImages] = useState<UploadedImage[]>([]);
  const [outputImages, setOutputImages] = useState<UploadedImage[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch(`/api/v1/prompt-versions/${params.id}`)
      .then((r) => r.json())
      .then((r) => {
        setPromptVersion(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleGenerate = useCallback(async () => {
    if (!promptVersion) return;
    setGenerating(true);
    setMockResult(null);

    try {
      const res = await fetch('/api/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_version_id: promptVersion.id,
          input_images: inputImages.map((img) => img.url),
        }),
      });

      const data = await res.json();
      if (data.data) {
        setMockResult(data.data);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  }, [promptVersion, inputImages]);

  const handleSave = useCallback(async () => {
    if (!promptVersion || !mockResult) return;
    setSaving(true);

    try {
      const executionTime =
        typeof mockResult.response === 'object' && mockResult.response !== null
          ? (mockResult.response as Record<string, unknown>).execution_time_ms
          : undefined;

      const res = await fetch('/api/v1/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_version_id: promptVersion.id,
          input_images: inputImages.map((img) => ({ url: img.url })),
          output_images: outputImages.map((img) => ({ url: img.url })),
          notes: notes || undefined,
          execution_time: typeof executionTime === 'number' ? Math.round(executionTime) : undefined,
        }),
      });

      const data = await res.json();
      if (data.data?.id) {
        router.push(`/generations/${data.data.id}`);
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  }, [promptVersion, mockResult, inputImages, outputImages, notes, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-primary-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (!promptVersion) {
    return <p className="py-8 text-center text-gray-500">Prompt version not found.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push(`/prompt-versions/${params.id}`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to {promptVersion.name || 'Prompt Version'}
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Generate Image</h1>
        <p className="mt-1 text-sm text-gray-500">
          Using prompt: {promptVersion.name || 'Untitled'}
        </p>
      </div>

      {/* Prompt Context */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">System Prompt</h2>
          <pre className="mt-3 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap text-gray-700">
            {promptVersion.systemPrompt}
          </pre>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">User Prompt</h2>
          <pre className="mt-3 max-h-48 overflow-y-auto text-sm whitespace-pre-wrap text-gray-700">
            {promptVersion.userPrompt}
          </pre>
        </div>
      </div>

      {/* Model Settings */}
      {(promptVersion.model || promptVersion.outputType || promptVersion.aspectRatio) && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900 uppercase">Model Settings</h2>
          <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {promptVersion.model && (
              <div>
                <dt className="text-xs text-gray-500">Model</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{promptVersion.model}</dd>
              </div>
            )}
            {promptVersion.outputType && (
              <div>
                <dt className="text-xs text-gray-500">Output Type</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {promptVersion.outputType}
                </dd>
              </div>
            )}
            {promptVersion.aspectRatio && (
              <div>
                <dt className="text-xs text-gray-500">Aspect Ratio</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {promptVersion.aspectRatio}
                </dd>
              </div>
            )}
            {promptVersion.outputResolution && (
              <div>
                <dt className="text-xs text-gray-500">Resolution</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {promptVersion.outputResolution}
                </dd>
              </div>
            )}
            {promptVersion.temperature && (
              <div>
                <dt className="text-xs text-gray-500">Temperature</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {promptVersion.temperature}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Step 1: Input Images */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Step 1: Input Images (Optional)
        </h2>
        <ImageUpload
          label="Upload reference / input images"
          images={inputImages}
          onImagesChange={setInputImages}
          maxImages={5}
        />
      </div>

      {/* Step 2: Generate */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
          Step 2: Run Generation (Mock)
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          This will simulate an API call to the AI image generation service with the prompt above.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {generating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            'Generate Image'
          )}
        </button>

        {/* Mock API Request/Response */}
        {mockResult && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">API Request</h3>
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(mockResult.request, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">API Response</h3>
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
                {JSON.stringify(mockResult.response, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Upload Output Images */}
      {mockResult && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
            Step 3: Upload Output Images
          </h2>
          <p className="mb-4 text-sm text-gray-500">
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

      {/* Step 4: Notes & Save */}
      {mockResult && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 uppercase">
            Step 4: Save Generation
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
            {saving ? 'Saving...' : 'Save Generation'}
          </button>
          {outputImages.length === 0 && (
            <p className="mt-2 text-xs text-amber-600">
              Upload at least one output image before saving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
