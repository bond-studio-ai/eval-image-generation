import { describe, expect, it } from "vitest";
import { errorMessageOr } from "@/lib/error-message";

describe("errorMessageOr", () => {
  it("returns the Error's message", () => {
    expect(errorMessageOr(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns the fallback for non-Error throwables", () => {
    expect(errorMessageOr("a string", "fallback")).toBe("fallback");
    expect(errorMessageOr(null, "fallback")).toBe("fallback");
    expect(errorMessageOr({ message: "fake" }, "fallback")).toBe("fallback");
  });

  it("recognizes Error subclasses", () => {
    expect(errorMessageOr(new TypeError("bad type"), "fallback")).toBe("bad type");
  });
});
