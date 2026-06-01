import { describe, expect, it } from "vitest";
import { normalizeGenerationRow } from "@/lib/generation-row";

describe("normalizeGenerationRow", () => {
  it("passes through a well-formed row", () => {
    const row = normalizeGenerationRow({
      id: "g1",
      promptVersionId: "pv1",
      promptName: "Prompt A",
      sceneAccuracyRating: "GOOD",
      productAccuracyRating: null,
      notes: "ok",
      executionTime: 1200,
      createdAt: "2026-01-01",
      resultUrls: ["a.png"],
      resultCount: 1
    });
    expect(row).toMatchObject({ id: "g1", promptName: "Prompt A", resultCount: 1 });
  });

  it("falls back to defaults for missing/malformed fields", () => {
    const row = normalizeGenerationRow({ id: 123, resultUrls: "not-an-array", resultCount: "nope" });
    expect(row.id).toBe("");
    expect(row.resultUrls).toEqual([]);
    expect(row.resultCount).toBe(0);
    expect(row.promptName).toBeNull();
  });

  it("treats non-object input as an empty row", () => {
    const row = normalizeGenerationRow(null);
    expect(row.id).toBe("");
    expect(row.createdAt).toBe("");
  });
});
