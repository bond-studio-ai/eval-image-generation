import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProjectWithRenderBootstrap } from "@/lib/projects";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const project = { id: "PRJ-1", name: "My Project", appStatus: "active" };

describe("fetchProjectWithRenderBootstrap", () => {
  it("throws when projectId is blank", async () => {
    await expect(fetchProjectWithRenderBootstrap("   ")).rejects.toThrow("projectId is required");
  });

  it("requests the local project route with the design + frames query", async () => {
    const fetchFn = stubFetch(() => Promise.resolve(jsonResponse({ data: [project] })));
    await fetchProjectWithRenderBootstrap("PRJ-1");
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(url).toContain("/api/v1/projects/PRJ-1");
    expect(url).toContain("format%5B%5D=design%3Aunity-slim");
    expect(url).toContain("include%5B%5D=camera_frames");
  });

  it("throws on a non-ok response", async () => {
    stubFetch(() => Promise.resolve(new Response("bad", { status: 500 })));
    await expect(fetchProjectWithRenderBootstrap("PRJ-1")).rejects.toThrow(/\(500\)/);
  });

  it("throws when the project is missing from the data array", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [] })));
    await expect(fetchProjectWithRenderBootstrap("PRJ-1")).rejects.toThrow(/not found/);
  });

  it("throws when the project response is missing the required id", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [{ name: "no id" }] })));
    await expect(fetchProjectWithRenderBootstrap("PRJ-1")).rejects.toThrow(/missing required fields/);
  });

  it("returns a normalized bootstrap with null design/room and empty frames", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [project] })));
    const result = await fetchProjectWithRenderBootstrap("PRJ-1");
    expect(result.project).toMatchObject({ id: "PRJ-1", name: "My Project" });
    expect(result.designMaterials).toBeNull();
    expect(result.roomData).toBeNull();
    expect(result.cameraFrames).toEqual([]);
  });

  it("passes the raw scan through and normalizes camera frames", async () => {
    const frame = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, fov: 60, aspect: 1.5, priority: 1, summary: "front", products: [] };
    stubFetch(() => Promise.resolve(jsonResponse({ data: [{ ...project, scan: { roomId: "r1" }, cameraFrames: [frame] }] })));
    const result = await fetchProjectWithRenderBootstrap("PRJ-1");
    expect(result.roomData).toEqual({ roomId: "r1" });
    expect(result.cameraFrames).toHaveLength(1);
    expect(result.cameraFrames[0]).toMatchObject({ fov: 60, summary: "front" });
  });

  it("ignores camera frames that arrive as malformed JSON strings", async () => {
    stubFetch(() => Promise.resolve(jsonResponse({ data: [{ ...project, cameraFrames: "{not json" }] })));
    const result = await fetchProjectWithRenderBootstrap("PRJ-1");
    expect(result.cameraFrames).toEqual([]);
  });
});
