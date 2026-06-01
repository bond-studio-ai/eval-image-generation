import { describe, expect, it } from "vitest";
import { assertNever } from "@/lib/assert-never";

describe("assertNever", () => {
  it("throws including the offending value", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(/Unhandled discriminated union member/);
    expect(() => assertNever("unexpected" as never)).toThrow(/"unexpected"/);
  });
});
