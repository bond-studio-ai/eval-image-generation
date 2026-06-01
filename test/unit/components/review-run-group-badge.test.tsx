// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReviewState } from "@/components/review-badge";
import { ReviewRunGroupBadge } from "@/components/review-run-group-badge";

const runReviewPost = vi.fn();
vi.mock("@/components/run-review-post", () => ({
  runReviewPost: (...args: unknown[]) => runReviewPost(...args)
}));

function statuses(entries: Record<string, ReviewState>): Map<string, ReviewState> {
  return new Map(Object.entries(entries));
}

describe("ReviewRunGroupBadge", () => {
  it("renders nothing for an empty id list", () => {
    const { container } = render(<ReviewRunGroupBadge generationIds={[]} statuses={new Map()} setStatus={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the idle CTA with a count and fires reviews on click", async () => {
    runReviewPost.mockResolvedValue({ kind: "done" });
    const setStatus = vi.fn();
    render(<ReviewRunGroupBadge generationIds={["g1", "g2"]} statuses={new Map()} setStatus={setStatus} />);
    const button = screen.getByRole("button", { name: /Automate QA \(2\)/ });
    await userEvent.click(button);
    expect(setStatus).toHaveBeenCalledWith("g1", { kind: "running" });
  });

  it("aggregates a fully-reviewed row", () => {
    render(<ReviewRunGroupBadge generationIds={["g1", "g2"]} statuses={statuses({ g1: { kind: "done" }, g2: { kind: "done" } })} setStatus={vi.fn()} />);
    expect(screen.getByText("Reviewed 2/2")).toBeInTheDocument();
  });

  it("aggregates a mixed row", () => {
    render(<ReviewRunGroupBadge generationIds={["g1", "g2"]} statuses={statuses({ g1: { kind: "done" } })} setStatus={vi.fn()} />);
    expect(screen.getByText("Reviewed 1/2")).toBeInTheDocument();
  });

  it("shows the running progress counter", () => {
    render(<ReviewRunGroupBadge generationIds={["g1", "g2"]} statuses={statuses({ g1: { kind: "running" }, g2: { kind: "done" } })} setStatus={vi.fn()} />);
    expect(screen.getByText("Reviewing 1/2")).toBeInTheDocument();
  });
});
