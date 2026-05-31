import type { z } from "zod";
import { parseOrThrow } from "./parse";

/**
 * Fetch JSON from a (proxied) API route and validate it against a zod schema.
 * The schema describes the actual response body, so wrapped payloads use an
 * envelope schema (e.g. `dataEnvelope(rowSchema)` from `./schemas`).
 *
 * Throws on a non-2xx response or on a validation failure, which react-query
 * surfaces as an error state.
 */
export async function fetchJson<S extends z.ZodType>(url: string, schema: S, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${url}`);
  const body: unknown = await res.json();
  return parseOrThrow(schema, body, url);
}
