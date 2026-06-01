import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchJson } from "@/lib/api/client";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const schema = z.object({ data: z.array(z.object({ id: z.string() })) });

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("fetchJson", () => {
  it("returns parsed JSON on a 2xx response", async () => {
    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ data: [{ id: "a" }] }), { status: 200 })));
    await expect(fetchJson("/api/v1/things", schema)).resolves.toEqual({ data: [{ id: "a" }] });
  });

  it("forwards the request init to fetch", async () => {
    const fn = stubFetch(() => Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 })));
    await fetchJson("/api/v1/things", schema, { method: "POST" });
    expect(fn).toHaveBeenCalledWith("/api/v1/things", { method: "POST" });
  });

  it("throws on a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(new Response("nope", { status: 500 })));
    await expect(fetchJson("/api/v1/things", schema)).rejects.toThrow(/Request failed \(500\)/);
  });

  it("throws when the body fails schema validation", async () => {
    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ data: [{ id: 1 }] }), { status: 200 })));
    await expect(fetchJson("/api/v1/things", schema)).rejects.toThrow(/Malformed response/);
  });
});
