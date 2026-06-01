import { describe, expect, it } from "vitest";
import { catchToNull, parseJsonOrEmpty } from "@/lib/async-utils";

describe("catchToNull", () => {
  it("resolves to the awaited value on success", async () => {
    await expect(catchToNull(Promise.resolve("ok"))).resolves.toBe("ok");
  });

  it("resolves to null on rejection", async () => {
    await expect(catchToNull(Promise.reject(new Error("boom")))).resolves.toBeNull();
  });
});

describe("parseJsonOrEmpty", () => {
  it("parses a valid JSON body", async () => {
    const res = new Response(JSON.stringify({ a: 1 }));
    await expect(parseJsonOrEmpty(res)).resolves.toEqual({ a: 1 });
  });

  it("returns {} for an unparseable body", async () => {
    const res = new Response("not json");
    await expect(parseJsonOrEmpty(res)).resolves.toEqual({});
  });
});
