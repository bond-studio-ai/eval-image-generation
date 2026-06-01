import { auth } from "@clerk/nextjs/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/v1/upload/route";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

const { s3Send } = vi.hoisted(() => ({ s3Send: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = s3Send;
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  }
}));

const mockedAuth = vi.mocked(auth);

function uploadRequest(file: File | null) {
  const form = new FormData();
  if (file) form.set("file", file);
  return new Request("https://app.test/api/v1/upload", { method: "POST", body: form });
}

beforeEach(() => {
  mockedAuth.mockResolvedValue({ userId: "user_1" } as Awaited<ReturnType<typeof auth>>);
  vi.stubEnv("AWS_S3_BUCKET", "my-bucket");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "ak");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "sk");
  vi.stubEnv("AWS_S3_REGION", "us-west-2");
  s3Send.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST upload", () => {
  it("returns 401 when unauthenticated", async () => {
    mockedAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
    const res = await POST(uploadRequest(new File(["x"], "a.png", { type: "image/png" })));
    expect(res.status).toBe(401);
  });

  it("rejects a request with no file", async () => {
    const res = await POST(uploadRequest(null));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { message: "file is required" } });
  });

  it("rejects a disallowed content type", async () => {
    const res = await POST(uploadRequest(new File(["x"], "a.txt", { type: "text/plain" })));
    expect(res.status).toBe(400);
  });

  it("uploads an allowed image to S3 and returns the public url", async () => {
    const res = await POST(uploadRequest(new File(["hello"], "photo.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { publicUrl: string; key: string } };
    expect(body.data.publicUrl).toMatch(/^https:\/\/my-bucket\.s3\.us-west-2\.amazonaws\.com\/evals\/uploads\/.+\.png$/);
    expect(s3Send).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the S3 upload throws", async () => {
    s3Send.mockRejectedValue(new Error("s3 down"));
    const res = await POST(uploadRequest(new File(["hello"], "photo.png", { type: "image/png" })));
    expect(res.status).toBe(500);
  });
});
