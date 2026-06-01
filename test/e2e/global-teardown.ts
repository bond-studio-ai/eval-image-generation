import type { FullConfig, TestInfo } from "@playwright/test";
import { CDPClient } from "monocart-coverage-reports";
import { addCoverageReport } from "monocart-reporter";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Server-side V8 coverage collection for the E2E suite.
 *
 * When `COVERAGE_RAW=1`, the Next server is started by `playwright.config.ts`
 * with `NODE_V8_COVERAGE` + `--inspect` (see `webServer`). Here — while the
 * server is still alive — we connect over CDP, flush its V8 coverage to disk,
 * attach the compiled source for each file, and hand it to monocart-reporter so
 * it lands in the same `raw` report as the client coverage. Source maps for
 * these `file://` entries resolve from disk at merge time.
 *
 * No-op unless the flag is set, so normal a11y/visual runs are unaffected.
 */

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

export default async function globalTeardown(config: FullConfig): Promise<void> {
  if (!process.env.COVERAGE_RAW) {
    return;
  }

  const dir = await flushServerCoverage();
  if (!dir) {
    return;
  }

  // monocart-reporter's addCoverageReport expects a TestInfo; on teardown there
  // is no real test, so we pass the minimal shape it reads (just `config`).
  const mockTestInfo = { config } as unknown as TestInfo;

  for (const filename of fs.readdirSync(dir)) {
    const json = JSON.parse(fs.readFileSync(path.resolve(dir, filename), "utf8")) as { result?: { url?: string; source?: string }[] };
    const list = (json.result ?? []).filter((entry) => entry.url?.startsWith("file:") && !entry.url.includes("/node_modules/"));

    if (list.length === 0) {
      continue;
    }

    for (const entry of list) {
      const filePath = fileURLToPath(entry.url!);
      if (fs.existsSync(filePath)) {
        entry.source = fs.readFileSync(filePath, "utf8");
      }
    }

    await addCoverageReport(list, mockTestInfo);
  }
}
