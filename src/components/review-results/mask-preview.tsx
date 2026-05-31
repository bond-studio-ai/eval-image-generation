"use client";

import { useEffect, useRef, useState } from "react";
import { CdnImage } from "@/components/cdn-image";
import type { CategoryMask } from "./types";

/**
 * `next/image` (via {@link CdnImage}) with a pulsing gray skeleton that fills the container
 * until the network image actually loads. The S3 overlays can take a
 * couple of seconds to fetch, especially for large composites, and
 * showing nothing during that window made the modal feel broken.
 *
 * `containerClassName` controls the box (and therefore the skeleton's
 * size — typically an `aspect-*` utility); `imgClassName` controls
 * how the loaded image fits inside.
 */
export function SkeletonImage({ src, alt, containerClassName, imgClassName }: { src: string; alt: string; containerClassName: string; imgClassName: string }) {
  // Track which URL has loaded/errored rather than a bare boolean, so a
  // URL change (e.g. after a force re-run swaps the overlay PNG) makes
  // the flags fall stale automatically — no effect needed to reset them,
  // and the old image never lingers while the new one decodes.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;
  const errored = erroredSrc === src;

  return (
    <div className={`relative ${containerClassName}`}>
      {!loaded && !errored && <div className="bg-border absolute inset-0 animate-pulse rounded" aria-hidden="true" />}
      {errored && <div className="bg-surface-sunken text-text-muted absolute inset-0 flex items-center justify-center rounded px-2 text-center text-[11px]">Failed to load image</div>}
      <CdnImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width:768px) 50vw, 33vw"
        onLoad={() => {
          setLoadedSrc(src);
        }}
        onError={() => {
          setErroredSrc(src);
        }}
        className={`${imgClassName} object-contain transition-opacity duration-150 ${loaded && !errored ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

/**
 * Combined per-category mask preview built on a `<canvas>` by drawing
 * each mask PNG on top of a black background using
 * `globalCompositeOperation = 'lighten'`. SAM emits black-bg /
 * white-shape masks, so `lighten` resolves to the union of every
 * white region — exactly what "merge all the masks for this category"
 * should look like.
 *
 * Why client-side and not in the backend overlay? The combined
 * overlay URL tints colors on top of the original photo, which is a
 * different artifact. Here we want a per-category black/white
 * silhouette that shows where SAM said this category lives, before
 * any tinting. Doing it on the canvas avoids another round-trip to
 * the service and stays trivially in sync whenever the underlying
 * mask URLs change.
 *
 * No CORS handshake is required: we never read pixels back, we just
 * draw the images, so a tainted canvas is fine. If the image fetch
 * itself fails we surface a placeholder rather than the misleading
 * partial draw.
 */
export function CompositeMaskCanvas({ masks, alt, containerClassName, canvasClassName }: { masks: CategoryMask[]; alt: string; containerClassName?: string; canvasClassName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Stable identity for `useEffect` so we don't repaint on every render
  // (each `buildRows` call returns fresh `masks` arrays even when the
  // URLs are unchanged).
  const maskKey = masks.map((mask) => mask.url).join("|");
  // Remember which `maskKey` the async paint resolved for. When `maskKey`
  // changes the stored result falls stale, so `status` derives back to
  // 'loading' during render — no effect reset needed.
  const [painted, setPainted] = useState<{ key: string; status: "ready" | "error" } | null>(null);
  const status: "loading" | "ready" | "error" = painted?.key === maskKey ? painted.status : "loading";

  useEffect(() => {
    if (masks.length === 0) {
      setPainted({ key: maskKey, status: "error" });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => {
          resolve(img);
        });
        img.addEventListener("error", () => {
          reject(new Error(`Failed to load mask: ${url}`));
        });
        img.src = url;
      });

    (async () => {
      try {
        const images = await Promise.all(masks.map((mask) => loadImage(mask.url)));
        if (cancelled) return;
        const first = images[0]!;
        // Cap to a sensible canvas size — masks are typically
        // 2400x1792 which is wasteful for a thumbnail tile.
        const MAX_DIM = 800;
        const scale = Math.min(1, MAX_DIM / Math.max(first.naturalWidth, first.naturalHeight));
        const width = Math.max(1, Math.round(first.naturalWidth * scale));
        const height = Math.max(1, Math.round(first.naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPainted({ key: maskKey, status: "error" });
          return;
        }
        // Black background so any pixel not painted by a mask stays
        // black — matches SAM's individual-mask appearance.
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = "lighten";
        for (const img of images) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        setPainted({ key: maskKey, status: "ready" });
      } catch {
        if (!cancelled) setPainted({ key: maskKey, status: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- maskKey covers it
  }, [maskKey]);

  return (
    <div className={`relative ${containerClassName ?? ""}`}>
      {status === "loading" && <div className="bg-surface-sunken absolute inset-0 animate-pulse" aria-hidden="true" />}
      {status === "error" && (
        <div className="bg-surface absolute inset-0 flex items-center justify-center">
          <p className="text-text-disabled px-2 text-center text-[10px] italic">No combined preview</p>
        </div>
      )}
      <canvas ref={canvasRef} aria-label={alt} className={`${canvasClassName ?? ""} transition-opacity duration-150 ${status === "ready" ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
