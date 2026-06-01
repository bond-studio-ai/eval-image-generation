import { afterEach, describe, expect, it, vi } from "vitest";
import { imageGenerationBase, imageGenerationV2Base, platformApiBase, s3UploadConfig } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("imageGenerationBase / imageGenerationV2Base", () => {
  it("derives the v1 and v2 base URLs from BASE_API_HOSTNAME", () => {
    vi.stubEnv("BASE_API_HOSTNAME", "https://api.example.com");
    expect(imageGenerationBase()).toBe("https://api.example.com/image-generation/v1");
    expect(imageGenerationV2Base()).toBe("https://api.example.com/image-generation/v2");
  });

  it("strips a trailing slash from the hostname", () => {
    vi.stubEnv("BASE_API_HOSTNAME", "https://api.example.com/");
    expect(imageGenerationBase()).toBe("https://api.example.com/image-generation/v1");
  });

  it("throws when BASE_API_HOSTNAME is missing", () => {
    vi.stubEnv("BASE_API_HOSTNAME", "");
    expect(() => imageGenerationBase()).toThrow(/BASE_API_HOSTNAME is not set/);
  });
});

describe("platformApiBase", () => {
  it("normalizes the protocol to https", () => {
    vi.stubEnv("BASE_API_HOSTNAME", "http://api.example.com");
    expect(platformApiBase()).toBe("https://api.example.com");
  });

  it("adds https when no protocol is present", () => {
    vi.stubEnv("BASE_API_HOSTNAME", "api.example.com");
    expect(platformApiBase()).toBe("https://api.example.com");
  });
});

describe("s3UploadConfig", () => {
  it("returns the configured bucket/credentials with a default region", () => {
    vi.stubEnv("AWS_S3_BUCKET", "bucket");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("AWS_S3_REGION", "");
    expect(s3UploadConfig()).toEqual({ bucket: "bucket", accessKeyId: "key", secretAccessKey: "secret", region: "us-west-2" });
  });

  it("honors an explicit region", () => {
    vi.stubEnv("AWS_S3_BUCKET", "bucket");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "key");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("AWS_S3_REGION", "eu-west-1");
    expect(s3UploadConfig().region).toBe("eu-west-1");
  });

  it("throws listing the missing variables", () => {
    vi.stubEnv("AWS_S3_BUCKET", "");
    vi.stubEnv("AWS_ACCESS_KEY_ID", "");
    vi.stubEnv("AWS_SECRET_ACCESS_KEY", "");
    expect(() => s3UploadConfig()).toThrow(/AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY/);
  });
});
