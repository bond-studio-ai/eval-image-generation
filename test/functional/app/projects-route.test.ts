import { auth } from "@clerk/nextjs/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.BASE_API_HOSTNAME = "api.example.com";
});

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const { GET: getProjects } = await import("@/app/api/v1/projects/route");
const { GET: getProjectDetail } = await import("@/app/api/v1/projects/[projectId]/route");
const { POST: postProjectDesign } = await import("@/app/api/v1/projects/[projectId]/design/route");

const mockedAuth = vi.mocked(auth);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  mockedAuth.mockResolvedValue({ userId: "user_1" } as Awaited<ReturnType<typeof auth>>);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

afterAll(() => {
  delete process.env.BASE_API_HOSTNAME;
});

describe("GET projects list", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    const res = await getProjects(new Request("https://app.test/api/v1/projects"));
    expect(res.status).toBe(401);
  });

  it("forwards recognized scalar/array params and normalizes pagination", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "PRJ-1" }], pagination: { total: 1 } })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await getProjects(new Request("https://app.test/api/v1/projects?status=active&page=2&limit=10&include[]=rooms&junk=drop"));
    expect(res.status).toBe(200);
    const [url] = fetchFn.mock.calls[0] ?? [];
    expect(url).toContain("https://api.example.com/v2/projects");
    expect(url).toContain("status=active");
    expect(url).toContain("include%5B%5D=rooms");
    expect(url).not.toContain("junk=drop");
  });

  it("returns 500 when the upstream errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 500 })))
    );
    const res = await getProjects(new Request("https://app.test/api/v1/projects"));
    expect(res.status).toBe(500);
  });
});

describe("GET project detail", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    const res = await getProjectDetail(new Request("https://app.test"), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(401);
  });

  it("passes the upstream body through unchanged", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: [{ id: "PRJ-1" }] })));
    vi.stubGlobal("fetch", fetchFn);
    const res = await getProjectDetail(new Request("https://app.test?include[]=rooms"), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    await expect(res.json()).resolves.toEqual({ data: [{ id: "PRJ-1" }] });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/v2/projects/PRJ-1");
  });

  it("returns 500 when the upstream errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad", { status: 404 })))
    );
    const res = await getProjectDetail(new Request("https://app.test"), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(500);
  });
});

function designRequest(body: unknown) {
  return new Request("https://app.test", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}

describe("POST project design", () => {
  it("rejects a missing design with a 400", async () => {
    const res = await postProjectDesign(designRequest({}), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(400);
  });

  it("rejects a design with no recognized keys", async () => {
    const res = await postProjectDesign(designRequest({ design: { unknownKey: 1 } }), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { message: "design payload is empty" } });
  });

  it("creates a new design when no existing room design is present", async () => {
    const room = { layout: { design: { vanity: "v1" } } };
    const fetchFn = vi
      .fn()
      // initial fetchRoomByProjectId -> no design
      .mockResolvedValueOnce(jsonResponse({ data: [{ layout: {} }] }))
      // create design POST
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      // updated room fetch
      .mockResolvedValueOnce(jsonResponse({ data: [room] }));
    vi.stubGlobal("fetch", fetchFn);
    const res = await postProjectDesign(designRequest({ design: { vanity: "v1" } }), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ data: { room_data: { design: { vanity: "v1" } } } });
    expect((fetchFn.mock.calls[1]?.[1] as RequestInit).method).toBe("POST");
  });

  it("patches an existing design when one is found", async () => {
    const existing = { layout: { design: { id: "design-9", vanity: "old" } } };
    const updated = { layout: { design: { id: "design-9", vanity: "new" } } };
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [existing] }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ data: [updated] }));
    vi.stubGlobal("fetch", fetchFn);
    const res = await postProjectDesign(designRequest({ design: { vanity: "new" } }), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(200);
    expect((fetchFn.mock.calls[1]?.[1] as RequestInit).method).toBe("PATCH");
    expect(fetchFn.mock.calls[1]?.[0]).toContain("/designs/design-9");
  });

  it("returns 500 when the studio create call fails", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ layout: {} }] }))
      .mockResolvedValueOnce(new Response("bad", { status: 500 }));
    vi.stubGlobal("fetch", fetchFn);
    const res = await postProjectDesign(designRequest({ design: { vanity: "v1" } }), { params: Promise.resolve({ projectId: "PRJ-1" }) });
    expect(res.status).toBe(500);
  });
});
