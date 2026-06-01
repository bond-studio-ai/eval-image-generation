import { afterEach, describe, expect, it, vi } from "vitest";
import { createDollhouseRender, DollhouseRenderApiError, getDollhouseRender } from "@/lib/dollhouse-renders";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const render = { id: "r1", projectId: "p1", status: "pending" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getDollhouseRender", () => {
  it("returns the first render in the data envelope", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [render] })));
    await expect(getDollhouseRender("r1")).resolves.toMatchObject({ id: "r1" });
  });

  it("returns null on a 404", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({}, 404)));
    await expect(getDollhouseRender("missing")).resolves.toBeNull();
  });

  it("returns null when the data array is empty", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [] })));
    await expect(getDollhouseRender("r1")).resolves.toBeNull();
  });

  it("appends the include[]=frames param", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(jsonResponse({ data: [render] })));
    await getDollhouseRender("r1", { includeFrames: true });
    expect(decodeURIComponent(fetchFn.mock.calls[0]?.[0] ?? "")).toContain("include[]=frames");
  });

  it("uses an explicit baseUrl when provided", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(jsonResponse({ data: [render] })));
    await getDollhouseRender("r1", { baseUrl: "https://upstream.test/v2" });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("https://upstream.test/v2/dollhouse-renders/r1");
  });

  it("throws a DollhouseRenderApiError with summarized zod issues", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: { code: "VALIDATION", message: "Invalid request body", details: { issues: { "designMaterials.id": ["Required"] } } } }, 422)));
    await expect(getDollhouseRender("r1")).rejects.toMatchObject({
      name: "DollhouseRenderApiError",
      status: 422,
      message: "Invalid request body — designMaterials.id: Required"
    });
  });
});

describe("createDollhouseRender", () => {
  const body = { cameraFrames: [], designMaterials: { id: "d", objects: {}, surfaces: {} }, imageConfig: { format: "Png" as const, height: 1, width: 1 }, projectId: "p1", roomData: {} };

  it("returns the created render", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [render] })));
    await expect(createDollhouseRender(body)).resolves.toMatchObject({ id: "r1" });
  });

  it("throws when the response has no render object", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [] })));
    await expect(createDollhouseRender(body)).rejects.toThrow(/no render object/);
  });

  it("throws a DollhouseRenderApiError on a non-2xx response", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ error: { message: "boom" } }, 500)));
    await expect(createDollhouseRender(body)).rejects.toBeInstanceOf(DollhouseRenderApiError);
  });
});
