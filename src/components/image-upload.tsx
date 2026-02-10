'use client';

import { ImageWithSkeleton } from '@/components/image-with-skeleton';
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
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ label, images, onImagesChange, maxImages = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<UploadedImage | null> => {
    const previewUrl = URL.createObjectURL(file);

    try {
      // Try S3 upload via presigned URL
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!res.ok) {
        throw new Error('S3 upload API unavailable');
      }

      const { uploadUrl, publicUrl } = await res.json().then((r) => r.data);

      // Upload directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error('S3 PUT failed');
      }

      return { url: publicUrl, name: file.name, previewUrl };
    } catch {
      // Fallback: store as data URL (works without S3 configured)
      try {
        const dataUrl = await fileToDataUrl(file);
        return { url: dataUrl, name: file.name, previewUrl };
      } catch (fallbackErr) {
        console.error('Upload error:', fallbackErr);
        return null;
      }
    }
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remaining = maxImages - images.length;
      const toUpload = fileArray.slice(0, remaining);

      if (toUpload.length === 0) return;

      setUploading(true);

      setError(null);
      const results = await Promise.all(toUpload.map(uploadFile));
      const successful = results.filter((r): r is UploadedImage => r !== null);

      if (successful.length < toUpload.length) {
        setError(`${toUpload.length - successful.length} file(s) failed to upload.`);
      }

      onImagesChange([...images, ...successful]);
      setUploading(false);
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
            <div key={idx} className="group relative">
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
