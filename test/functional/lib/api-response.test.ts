import { describe, expect, it } from "vitest";
import { errorResponse, successResponse } from "@/lib/api-response";

describe("successResponse", () => {
  it("wraps data in a { data } envelope with a 200 default", async () => {
    const res = successResponse({ id: "x" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: { id: "x" } });
  });

  it("honors a custom status", () => {
    expect(successResponse({ id: "x" }, 201).status).toBe(201);
  });
});

describe("errorResponse", () => {
  it("maps the error code to its HTTP status", () => {
    expect(errorResponse("NOT_FOUND", "missing").status).toBe(404);
    expect(errorResponse("UNAUTHORIZED", "nope").status).toBe(401);
    expect(errorResponse("INTERNAL_ERROR", "boom").status).toBe(500);
  });

  it("includes the code and message, and details only when provided", async () => {
    const withDetails = await errorResponse("VALIDATION_ERROR", "bad", { field: "name" }).json();
    expect(withDetails).toEqual({ error: { code: "VALIDATION_ERROR", message: "bad", details: { field: "name" } } });

    const withoutDetails = await errorResponse("CONFLICT", "dupe").json();
    expect(withoutDetails).toEqual({ error: { code: "CONFLICT", message: "dupe" } });
  });
});
