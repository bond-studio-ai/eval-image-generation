"use client";

import { useCallback, useRef, useState } from "react";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { UploadIcon, XIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { localUrl } from "@/lib/api-base";

interface SceneImageInputProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export function SceneImageInput({ label, value, onChange }: SceneImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(localUrl("upload"), {
          method: "POST",
          body: formData
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || `Upload failed (${res.status})`);

        onChange(json.data.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const file = Array.from(files)[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div>
      <p className="text-text-secondary text-caption mb-2 font-medium">{label}</p>

      {value ? (
        <div className="group relative">
          <ImageWithSkeleton src={value} alt={label} wrapperClassName="min-h-96 h-96 w-full rounded-lg border border-border bg-surface-muted" />
          <button type="button" aria-label="Remove image" onClick={() => onChange(null)} className="bg-danger-500 text-text-inverse absolute -top-2 -right-2 rounded-full p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <XIcon className="size-3" />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            aria-label={label}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label={`Upload ${label}`}
            className={`flex min-h-72 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-primary-500 bg-primary-50" : "border-border-strong hover:border-border-strong"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="text-text-secondary size-5" />
                <span className="text-text-secondary text-body">Uploading…</span>
              </div>
            ) : (
              <div>
                <UploadIcon className="text-text-disabled mx-auto size-8" strokeWidth={1.5} />
                <p className="text-text-muted text-caption mt-2">Drop image or click to browse</p>
              </div>
            )}
          </button>
        </>
      )}

      {error && <p className="text-danger-600 text-caption mt-1">{error}</p>}
    </div>
  );
}
