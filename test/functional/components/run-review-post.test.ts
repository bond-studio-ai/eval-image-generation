import { afterEach, describe, expect, it, vi } from "vitest";
import { runReviewPost } from "@/components/run-review-post";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runReviewPost", () => {
  it("returns a done state with cached flag and counts on success", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: { cached: true, succeeded: 3, promptCount: 5 } })));
    vi.stubGlobal("fetch", fetchFn);
    const result = await runReviewPost("gen-1", false);
    expect(result).toEqual({ kind: "done", cached: true, succeeded: 3, total: 5 });
    expect(fetchFn.mock.calls[0]?.[0]).toContain("/generations/gen-1/review");
  });

  it("appends force=true to the URL when forced", async () => {
    const fetchFn = vi.fn((_url: string) => Promise.resolve(jsonResponse({ data: {} })));
    vi.stubGlobal("fetch", fetchFn);
    await runReviewPost("gen-1", true);
    expect(fetchFn.mock.calls[0]?.[0]).toContain("review?force=true");
  });

  it("maps a 422 with no message to 'Nothing to review'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({}, 422)))
    );
    await expect(runReviewPost("gen-1", false)).resolves.toEqual({ kind: "error", message: "Nothing to review" });
  });

  it("uses the upstream error message when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(jsonResponse({ error: { message: "boom" } }, 500)))
    );
    await expect(runReviewPost("gen-1", false)).resolves.toEqual({ kind: "error", message: "boom" });
  });

  it("returns a network error state when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline")))
    );
    await expect(runReviewPost("gen-1", false)).resolves.toEqual({ kind: "error", message: "offline" });
  });
});
