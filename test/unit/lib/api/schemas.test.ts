import { describe, expect, it } from "vitest";
import { z } from "zod";
import { camelized, dataEnvelope, generationDetailSchema } from "@/lib/api/schemas";

describe("dataEnvelope", () => {
  it("wraps an inner schema in a { data } object", () => {
    const schema = dataEnvelope(z.array(z.number()));
    expect(schema.parse({ data: [1, 2] })).toEqual({ data: [1, 2] });
    expect(schema.safeParse({ data: "nope" }).success).toBe(false);
  });
});

describe("camelized", () => {
  it("accepts snake_case payloads and exposes them as camelCase", () => {
    const schema = camelized(z.object({ fooBar: z.number() }));
    expect(schema.parse({ foo_bar: 5 })).toEqual({ fooBar: 5 });
  });
});

describe("generationDetailSchema", () => {
  it("parses a minimal generation and defaults results to []", () => {
    const result = generationDetailSchema.parse({ id: "g1" });
    expect(result.id).toBe("g1");
    expect(result.results).toEqual([]);
  });

  it("normalizes result url nullishness to empty strings", () => {
    const result = generationDetailSchema.parse({
      id: "g1",
      results: [
        { id: "r1", url: null },
        { id: "r2", url: "u.png" }
      ]
    });
    expect(result.results).toEqual([
      { id: "r1", url: "" },
      { id: "r2", url: "u.png" }
    ]);
  });

  it("catches a malformed createdAt to an empty string", () => {
    const result = generationDetailSchema.parse({ id: "g1", createdAt: 12_345 });
    expect(result.createdAt).toBe("");
  });

  it("rejects payloads missing the required id", () => {
    expect(generationDetailSchema.safeParse({}).success).toBe(false);
  });
});
