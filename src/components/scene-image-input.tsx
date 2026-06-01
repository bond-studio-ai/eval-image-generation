"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageWithSkeleton } from "@/components/image-with-skeleton";
import { UploadIcon, XIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { localUrl } from "@/lib/api-base";
import { parseOrFallback } from "@/lib/api/parse";
import { uploadResponseSchema } from "@/lib/api/schemas";

interface SceneImageInputProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export function SceneImageInput({ label, value, onChange }: SceneImageInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        const json = parseOrFallback(uploadResponseSchema, await res.json(), {}, "scene image upload");
        if (!res.ok) throw new Error(json.error?.message || `Upload failed (${res.status})`);

        const publicUrl = json.data?.publicUrl;
        if (!publicUrl) throw new Error("Upload succeeded but no image URL was returned. Please try again.");
        onChange(publicUrl);
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : "Failed to upload image");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const [file] = accepted;
      if (file) void uploadFile(file);
    },
    // `accept` filters non-image files out before `onDrop`, so surface a clear
    // error for rejected drops instead of silently ignoring them.
    onDropRejected: () => {
      setError("Unsupported file type. Use a JPEG, PNG, WebP, or GIF image.");
    },
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [] },
    multiple: false,
    disabled: uploading
  });

  return (
    <div>
      <p className="text-text-secondary text-caption mb-2 font-medium">{label}</p>

      {value ? (
        <div className="group relative">
          <ImageWithSkeleton src={value} alt={label} wrapperClassName="min-h-96 h-96 w-full rounded-lg border border-border bg-surface-muted" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              onChange(null);
            }}
            className="bg-danger-500 text-text-inverse absolute -top-2 -right-2 rounded-full p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps({
            "aria-label": `Upload ${label}`,
            className: `flex min-h-72 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              isDragActive ? "border-primary-500 bg-primary-50" : "border-border-strong hover:border-border-strong"
            }`
          })}
        >
          <input {...getInputProps({ "aria-label": label })} />
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
        </div>
      )}

      {error && <p className="text-danger-600 text-caption mt-1">{error}</p>}
    </div>
  );
}
