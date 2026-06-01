import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.BASE_API_HOSTNAME = "api.example.com";
});

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const { POST } = await import("@/app/api/v1/layout-presets/bootstrap/route");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function bootstrapRequest(body: unknown) {
  return new Request("https://app.test/api/v1/layout-presets/bootstrap", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

afterAll(() => {
  delete process.env.BASE_API_HOSTNAME;
});

describe("POST layout-presets bootstrap", () => {
  it("rejects a missing layout_type_id", async () => {
    const res = await POST(bootstrapRequest({ pkg_id: "pkg-1" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { message: "layout_type_id is required" } });
  });

  it("rejects a missing pkg_id", async () => {
    const res = await POST(bootstrapRequest({ layout_type_id: "lt-1" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { message: "pkg_id is required" } });
  });

  it("creates and initializes a project then returns the settled room layout", async () => {
    const room = { cameraFrames: [1, 2], layout: { design: { id: "d1" } } };
    const fetchFn = vi.fn((url: string) => {
      if (url.includes("/rooms")) return Promise.resolve(jsonResponse({ data: [room] }));
      if (url.includes("/actions")) return Promise.resolve(jsonResponse({ ok: true }));
      return Promise.resolve(jsonResponse({ data: { id: "PRJ-1" } }));
    });
    vi.stubGlobal("fetch", fetchFn);

    const res = await POST(bootstrapRequest({ layout_type_id: "lt-1", pkg_id: "pkg-1" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { project_id: "PRJ-1", room_data: { design: { id: "d1" } } } });
    expect(fetchFn.mock.calls[1]?.[0]).toContain("/actions?type=Init");
  });

  it("returns 500 when project creation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 500 })))
    );
    const res = await POST(bootstrapRequest({ layout_type_id: "lt-1", pkg_id: "pkg-1" }));
    expect(res.status).toBe(500);
  });
});
