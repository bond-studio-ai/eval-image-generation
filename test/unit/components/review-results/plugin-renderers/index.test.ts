import { describe, expect, it } from "vitest";
import { pluginEntriesFor } from "@/components/review-results/plugin-renderers";
import type { ReviewAssessment } from "@/components/review-results/types";

describe("pluginEntriesFor", () => {
  it("returns an empty list when there is no assessment or no plugins", () => {
    expect(pluginEntriesFor(null)).toEqual([]);
    expect(pluginEntriesFor(undefined)).toEqual([]);
    expect(pluginEntriesFor({ version: 1, plugins: {} })).toEqual([]);
  });

  it("includes a present plugin key even when its payload is null", () => {
    const assessment = { version: 1, plugins: { segmentationDrift: null } } as unknown as ReviewAssessment;
    const entries = pluginEntriesFor(assessment);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.renderer.id).toBe("segmentationDrift");
    expect(entries[0]?.assessment).toBeNull();
  });

  it("preserves the registry order for multiple plugins", () => {
    const assessment = { version: 1, plugins: { depthDrift: { a: 1 }, segmentationDrift: { b: 2 } } } as unknown as ReviewAssessment;
    const entries = pluginEntriesFor(assessment);
    expect(entries.map((e) => e.renderer.id)).toEqual(["segmentationDrift", "depthDrift"]);
  });

  it("skips plugin ids that are absent from the envelope", () => {
    const assessment = { version: 1, plugins: { depthDrift: {} } } as unknown as ReviewAssessment;
    expect(pluginEntriesFor(assessment).map((e) => e.renderer.id)).toEqual(["depthDrift"]);
  });
});
