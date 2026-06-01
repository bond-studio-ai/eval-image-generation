import { SourceMapConsumer, SourceMapGenerator } from "@jridgewell/source-map";
import type { CoverageReportOptions, V8CoverageEntry } from "monocart-coverage-reports";

/**
 * Shared options for the E2E coverage `raw` report.
 *
 * Both the client fixture (per worker) and `global-teardown` (server side) add
 * their raw V8 data to a `CoverageReport` built from these options; MCR's
 * multiprocessing support funnels every worker's data into `.coverage-raw/e2e/.cache`,
 * and `global-teardown` calls `generate()` once to emit the `raw` report at
 * `.coverage-raw/e2e/raw`. Source-map resolution and `src/**` filtering happen
 * later, at the final merge (mcr.config.mjs) — this stage only preserves raw data.
 */

const INLINE_SOURCE_MAP = /\n?\/\/[#@]\s*sourceMappingURL=data:\S+\s*$/;

/**
 * A source map MCR can decode: a plain (non-indexed) map whose `mappings` is a
 * string. Index maps (`sections`) and maps with a missing/non-string `mappings`
 * crash MCR's V8 source-map decoder (`decodeSourceMappings`), so we never let
 * one reach it.
 */
export function isDecodableSourceMap(map: unknown): boolean {
  return typeof map === "object" && map !== null && !("sections" in map) && typeof (map as { mappings?: unknown }).mappings === "string";
}

/**
 * Return a source map MCR can decode, or `undefined` if there's nothing useful.
 *
 * Next emits some bundles (notably server route bundles) as **index maps**
 * (`sections`), which MCR's V8 decoder can't read. We flatten those into a plain
 * map with `@jridgewell/source-map`. Already-flat maps pass through; empty/stub
 * maps (no sources) return `undefined` so the entry is dropped rather than left
 * as a compiled path in the report.
 */
export function flattenSourceMap(map: unknown): object | undefined {
  if (isDecodableSourceMap(map)) {
    return map as object;
  }
  if (typeof map !== "object" || map === null || !("sections" in map)) {
    return undefined;
  }
  try {
    const consumer = new SourceMapConsumer(map as never);
    const flat = SourceMapGenerator.fromSourceMap(consumer).toJSON();
    return Array.isArray(flat.sources) && flat.sources.length > 0 ? flat : undefined;
  } catch {
    return undefined;
  }
}

function decodeDataUriJson(ref: string): unknown {
  const comma = ref.indexOf(",");
  if (comma === -1) {
    return undefined;
  }
  const meta = ref.slice(0, comma);
  const data = ref.slice(comma + 1);
  try {
    const json = meta.includes("base64") ? Buffer.from(data, "base64").toString("utf8") : decodeURIComponent(data);
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/**
 * Drop any source map MCR can't decode — both an attached `entry.sourceMap` and
 * an inline `data:` map embedded in the source — so a single malformed bundle
 * map (Next dev emits some) can't abort the whole report. Used as the `onEntry`
 * hook at both the raw and merge stages.
 */
export function sanitizeEntrySourceMap(entry: V8CoverageEntry): void {
  if (entry.sourceMap && !isDecodableSourceMap(entry.sourceMap)) {
    entry.sourceMap = undefined;
  }

  const { source } = entry;
  if (typeof source !== "string") {
    return;
  }
  const inline = /\/\/[#@]\s*sourceMappingURL=(data:\S+)/.exec(source)?.[1];
  if (inline && !isDecodableSourceMap(decodeDataUriJson(inline))) {
    entry.source = source.replace(INLINE_SOURCE_MAP, "");
  }
}

export const E2E_RAW_OPTIONS: CoverageReportOptions = {
  name: "E2E Coverage (raw)",
  outputDir: ".coverage-raw/e2e",
  reports: [["raw", { outputDir: "raw" }]],
  onEntry: sanitizeEntrySourceMap
};
