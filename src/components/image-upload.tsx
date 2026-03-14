'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
import { localUrl } from '@/lib/api-base';
import { useCallback, useRef, useState } from 'react';

interface UploadedImage {
  url: string;
  name: string;
  previewUrl: string;
}

interface ImageUploadProps {
  label: string;
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  /** Rendered above each image in the grid (e.g. a tag input). */
  renderAboveImage?: (index: number, image: UploadedImage) => React.ReactNode;
}

export function ImageUpload({ label, images, onImagesChange, maxImages = 10, renderAboveImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    const previewUrl = URL.createObjectURL(file);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(localUrl('upload'), {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Upload failed (${res.status})`);

    return { url: json.data.publicUrl, name: file.name, previewUrl };
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;
      const toUpload = fileArray.slice(0, remaining);

      if (toUpload.length === 0) return;

      setUploading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(toUpload.map(uploadFile));
        const successful: UploadedImage[] = [];
        const errors: string[] = [];

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            successful.push(result.value);
          } else if (result.status === 'rejected') {
            errors.push(result.reason instanceof Error ? result.reason.message : 'Upload failed');
          }
        }

        if (errors.length > 0) {
          setError(errors[0]);
        }

        if (successful.length > 0) {
          onImagesChange([...images, ...successful]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [images, maxImages, onImagesChange],
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

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>

      {/* Upload area */}
      <div
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
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
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            <span className="text-sm text-gray-600">Uploading...</span>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-8 w-8 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drag & drop images here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, WebP, GIF up to 10MB ({images.length}/{maxImages})
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.map((img, idx) => (
            <div key={idx} className="group relative flex flex-col gap-1.5">
              {renderAboveImage?.(idx, img)}
              <ImageWithSkeleton
                src={img.previewUrl || img.url}
                alt={img.name}
                wrapperClassName="h-24 w-full rounded-lg border border-gray-200"
                className="object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
                className="absolute -top-2 -right-2 hidden rounded-full bg-red-500 p-1 text-white shadow-sm group-hover:block"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
