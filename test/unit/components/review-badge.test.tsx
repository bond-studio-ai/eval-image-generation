// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewBadge } from "@/components/review-badge";

const runReviewPost = vi.fn();
vi.mock("@/components/run-review-post", () => ({
  runReviewPost: (...args: unknown[]) => runReviewPost(...args)
}));

describe("ReviewBadge", () => {
  it("renders nothing without a generation id", () => {
    const { container } = render(<ReviewBadge generationId={null} onStateChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the idle CTA and runs the review on click", async () => {
    runReviewPost.mockResolvedValue({ kind: "done" });
    const onStateChange = vi.fn();
    render(<ReviewBadge generationId="g1" onStateChange={onStateChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Automate QA/ }));
    expect(onStateChange).toHaveBeenCalledWith({ kind: "running" });
    await waitFor(() => {
      expect(onStateChange).toHaveBeenCalledWith({ kind: "done" });
    });
    expect(runReviewPost).toHaveBeenCalledWith("g1", false);
  });

  it("renders the checking and running states", () => {
    const { rerender } = render(<ReviewBadge generationId="g1" state={{ kind: "checking" }} onStateChange={vi.fn()} />);
    expect(screen.getByText("Checking")).toBeInTheDocument();
    rerender(<ReviewBadge generationId="g1" state={{ kind: "running" }} onStateChange={vi.fn()} />);
    expect(screen.getByText("Reviewing")).toBeInTheDocument();
  });

  it("renders the done state with counts", () => {
    render(<ReviewBadge generationId="g1" state={{ kind: "done", succeeded: 2, total: 3 }} onStateChange={vi.fn()} />);
    expect(screen.getByText("Reviewed 2/3")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(<ReviewBadge generationId="g1" state={{ kind: "error", message: "boom" }} onStateChange={vi.fn()} />);
    expect(screen.getByText("Review failed")).toBeInTheDocument();
  });
});
