import { CDPClient, CoverageReport } from "monocart-coverage-reports";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { E2E_RAW_OPTIONS, flattenSourceMap } from "./coverage-report";

/**
 * Finalizes E2E coverage for the suite.
 *
 * When `COVERAGE_RAW=1`, the Next server is started by `playwright.config.ts`
 * with `NODE_V8_COVERAGE` + `--inspect` (see `webServer`). Here — while the
 * server is still alive — we connect over CDP, flush its V8 coverage to disk,
 * attach the compiled source for each file, and add it to the same
 * `CoverageReport` the client fixtures fed. We then call `generate()` once to
 * write `.coverage-raw/e2e/raw` (merging every worker's client data from the
 * shared cache plus the server data). We always generate — even if the server
 * flush fails — so client coverage still produces a raw report.
 *
 * No-op unless the flag is set, so normal a11y/visual runs are unaffected.
 */
interface ServerCoverageEntry {
  url?: string;
  source?: string;
  sourceMap?: unknown;
}

const SOURCE_MAP_URL = /\/\/[#@]\s*sourceMappingURL=(\S+)/;

// Read the on-disk source map for a compiled server file so MCR can unpack it
// back to `src/**`. Production server bundles (.next/server/**) carry a sibling
// `<file>.js.map` but usually no `sourceMappingURL` comment, so we fall back to
// the sibling by convention. Index maps are flattened (see flattenSourceMap).
function resolveMapPath(source: string, filePath: string): string | undefined {
  const ref = SOURCE_MAP_URL.exec(source)?.[1];
  if (ref && !ref.startsWith("data:")) {
    return path.resolve(path.dirname(filePath), ref);
  }
  const sibling = `${filePath}.map`;
  return fs.existsSync(sibling) ? sibling : undefined;
}

function readDiskSourceMap(source: string, filePath: string): object | undefined {
  const mapPath = resolveMapPath(source, filePath);
  if (!mapPath || !fs.existsSync(mapPath)) {
    return undefined;
  }
  try {
    return flattenSourceMap(JSON.parse(fs.readFileSync(mapPath, "utf8")));
  } catch {
    return undefined; // best effort: leave it unmapped rather than fail the run
  }
}

// The Next CLI is started with `--inspect=<main>` (see playwright.config.ts).
// Server components / route handlers run in Next's forked render worker, which
// inherits the flag and inspects on the next free port (main + 1). Try the
// worker first, then the main process, so we capture server coverage either way.
const MAIN_INSPECT_PORT = Number(process.env.COVERAGE_INSPECT_PORT ?? 9229);
const INSPECT_PORTS = [MAIN_INSPECT_PORT + 1, MAIN_INSPECT_PORT];

async function writeCoverageFromPort(port: number): Promise<string | undefined> {
  const client = await CDPClient({ port });
  if (!client) {
    return undefined;
  }
  const dir = await client.writeCoverage();
  await client.close();
  return dir;
}

async function flushServerCoverage(): Promise<string | undefined> {
  for (const port of INSPECT_PORTS) {
    try {
      const dir = await writeCoverageFromPort(port);
      if (dir && fs.existsSync(dir)) {
        return dir;
      }
    } catch {
      // Try the next candidate port.
    }
  }
  console.warn(`[coverage] could not flush server V8 coverage from inspector ports ${INSPECT_PORTS.join(", ")}; server coverage skipped.`);
  return undefined;
}

function readServerCoverage(dir: string): ServerCoverageEntry[] {
  const entries: ServerCoverageEntry[] = [];
  for (const filename of fs.readdirSync(dir)) {
    const json = JSON.parse(fs.readFileSync(path.resolve(dir, filename), "utf8")) as { result?: ServerCoverageEntry[] };
    const list = (json.result ?? []).filter((entry) => entry.url?.startsWith("file:") && !entry.url.includes("/node_modules/"));
    for (const entry of list) {
      const filePath = fileURLToPath(entry.url!);
      if (fs.existsSync(filePath)) {
        entry.source = fs.readFileSync(filePath, "utf8");
        entry.sourceMap = readDiskSourceMap(entry.source, filePath);
        entries.push(entry);
      }
    }
  }
  return entries;
}

export default async function globalTeardown(): Promise<void> {
  if (!process.env.COVERAGE_RAW) {
    return;
  }

  const report = new CoverageReport(E2E_RAW_OPTIONS);

  const dir = await flushServerCoverage();
  if (dir) {
    const serverEntries = readServerCoverage(dir);
    if (serverEntries.length > 0) {
      await report.add(serverEntries);
    }
  }

  // Always generate: this merges every worker's client coverage (from the shared
  // cache) with the server coverage above into `.coverage-raw/e2e/raw`, so the
  // raw report exists even when the server flush yields nothing.
  await report.generate();
}
