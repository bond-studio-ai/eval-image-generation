"use client";

import NextImage, { type ImageLoaderProps, type ImageProps } from "next/image";
import { withImageParams } from "@/lib/image-utils";

/**
 * All site images are served from our CDNs, which already do resizing and
 * webp conversion via `?w=&f=webp` (see {@link withImageParams}). This loader
 * hands that work to the CDN instead of routing through the Next.js image
 * optimizer (`/_next/image`), so no server-side re-encoding happens and
 * `images.remotePatterns` is unnecessary — passing a `loader` makes next/image
 * skip the built-in optimizer entirely. We still get lazy loading, responsive
 * `srcset`, and layout-shift prevention from `next/image`.
 */
const cdnLoader = ({ src, width }: ImageLoaderProps): string => withImageParams(src, width);

export function CdnImage(props: ImageProps) {
  return <NextImage loader={cdnLoader} {...props} />;
}
