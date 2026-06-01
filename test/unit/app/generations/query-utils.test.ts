import { describe, expect, it } from "vitest";
import { buildGenerationsQuery } from "@/app/generations/query-utils";

describe("buildGenerationsQuery", () => {
  it("always includes the generations tab", () => {
    expect(buildGenerationsQuery({})).toBe("/executions?tab=generations");
  });

  it("includes provided filter params", () => {
    const query = buildGenerationsQuery({ prompt_version_id: "pv1", source: "dollhouse", sort: "createdAt", order: "desc" });
    expect(query).toContain("tab=generations");
    expect(query).toContain("prompt_version_id=pv1");
    expect(query).toContain("source=dollhouse");
    expect(query).toContain("sort=createdAt");
    expect(query).toContain("order=desc");
  });

  it("omits empty-string and absent params", () => {
    const query = buildGenerationsQuery({ prompt_version_id: "", unrated: "true" });
    expect(query).not.toContain("prompt_version_id");
    expect(query).not.toContain("scene_accuracy_rating");
    expect(query).toContain("unrated=true");
  });
});
