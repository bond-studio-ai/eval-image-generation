'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { withImageParams } from '@/lib/image-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface GenerationOutput {
  id: string;
  url: string;
  generationId: string;
  createdAt: string;
}

interface SceneImageInputProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SceneImageInput({ label, value, onChange }: SceneImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showPicker, setShowPicker] = useState(false);
  const [outputs, setOutputs] = useState<GenerationOutput[]>([]);
  const [loadingOutputs, setLoadingOutputs] = useState(false);

  useEffect(() => {
    if (!showPicker) return;
    setLoadingOutputs(true);
    fetch('/api/v1/generation-outputs?limit=50')
      .then((r) => r.json())
      .then((r) => setOutputs(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingOutputs(false));
  }, [showPicker]);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const res = await fetch('/api/v1/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        });

        if (!res.ok) throw new Error('S3 upload API unavailable');

        const { uploadUrl, publicUrl } = await res.json().then((r: { data: { uploadUrl: string; publicUrl: string } }) => r.data);

        const s3Res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!s3Res.ok) throw new Error('S3 PUT failed');
        onChange(publicUrl);
      } catch {
        try {
          const dataUrl = await fileToDataUrl(file);
          onChange(dataUrl);
        } catch {
          setError('Failed to upload image');
        }
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-600">{label}</p>

      {value ? (
        <div className="group relative">
          <ImageWithSkeleton
            src={withImageParams(value)}
            alt={label}
            loading="lazy"
            wrapperClassName="min-h-96 h-96 w-full rounded-lg border border-gray-200 bg-gray-50"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-8 w-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="mt-2 text-xs text-gray-500">
                  Drop image or click to browse
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowPicker(true);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            Pick from generation output
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPicker(false)}>
          <div
            className="mx-4 flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Pick from Generation Outputs</h3>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingOutputs ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : outputs.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">No generation outputs found.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {outputs.map((output) => (
                    <button
                      key={output.id}
                      type="button"
                      onClick={() => {
                        onChange(output.url);
                        setShowPicker(false);
                      }}
                      className="group overflow-hidden rounded-lg border border-gray-200 transition-all hover:border-primary-500 hover:ring-2 hover:ring-primary-200"
                    >
                      <ImageWithSkeleton
                        src={withImageParams(output.url)}
                        alt="Generation output"
                        loading="lazy"
                        wrapperClassName="h-28 w-full bg-gray-50"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
