import { describe, expect, it } from "vitest";
import { PAGE_SIZE, SOURCE_FILTER_OPTIONS, SOURCE_LABELS, THUMB } from "@/app/audit/compare/_components/run-picker-types";

describe("run-picker-types constants", () => {
  it("maps known source keys to labels", () => {
    expect(SOURCE_LABELS["preset"]).toBe("Preset");
    expect(SOURCE_LABELS["raw_input"]).toBe("Real Input");
    expect(SOURCE_LABELS["retry"]).toBe("Preset");
  });

  it("exposes the source filter options including an all option", () => {
    expect(SOURCE_FILTER_OPTIONS.map((o) => o.value)).toEqual(["all", "preset", "raw_input"]);
  });

  it("exposes layout sizing constants", () => {
    expect(THUMB).toBe(48);
    expect(PAGE_SIZE).toBe(50);
  });
});
