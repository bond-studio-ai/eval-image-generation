import { describe, expect, it } from "vitest";
import { browserTimezone, localUrl, serviceUrl, serviceV2Url } from "@/lib/api-base";

describe("serviceUrl", () => {
  it("builds a v1 proxy path", () => {
    expect(serviceUrl("strategies")).toBe("/api/v1/image-generation/strategies");
  });

  it("strips a leading slash from the path", () => {
    expect(serviceUrl("/generations")).toBe("/api/v1/image-generation/generations");
  });
});

describe("serviceV2Url", () => {
  it("builds a v2 proxy path and strips a leading slash", () => {
    expect(serviceV2Url("/providers/models")).toBe("/api/v1/image-generation-v2/providers/models");
  });
});

describe("localUrl", () => {
  it("builds a local BFF path", () => {
    expect(localUrl("projects/123")).toBe("/api/v1/projects/123");
    expect(localUrl("/upload")).toBe("/api/v1/upload");
  });
});

describe("browserTimezone", () => {
  it("returns a non-throwing string", () => {
    expect(typeof browserTimezone()).toBe("string");
  });
});
