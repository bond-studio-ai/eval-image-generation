import { describe, expect, it } from "vitest";
import { STRATEGY_PROPERTY_COLORS } from "@/lib/strategy-property-colors";

describe("STRATEGY_PROPERTY_COLORS", () => {
  it("assigns a bg/text pair to every property", () => {
    for (const value of Object.values(STRATEGY_PROPERTY_COLORS)) {
      expect(value.bg).toMatch(/^bg-/);
      expect(value.text).toMatch(/^text-/);
    }
  });

  it("keeps stable assignments for known properties", () => {
    expect(STRATEGY_PROPERTY_COLORS.model).toEqual({ bg: "bg-purple-100", text: "text-purple-700" });
    expect(STRATEGY_PROPERTY_COLORS.sceneAccuracy).toEqual({ bg: "bg-teal-100", text: "text-teal-800" });
  });
});
