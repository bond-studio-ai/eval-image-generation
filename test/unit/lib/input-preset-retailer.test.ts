import { describe, expect, it } from "vitest";
import { INPUT_PRESET_RETAILER_ID } from "@/lib/input-preset-retailer";

describe("INPUT_PRESET_RETAILER_ID", () => {
  it("is the fixed retailer UUID", () => {
    expect(INPUT_PRESET_RETAILER_ID).toBe("c1a7ba5f-4120-4eeb-87cb-39e018cbd581");
  });
});
