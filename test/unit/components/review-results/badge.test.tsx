// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewResultsBadge } from "@/components/review-results/badge";
import { renderWithQuery } from "../../../helpers";

describe("ReviewResultsBadge", () => {
  it("renders nothing until the review state is done", () => {
    const { container } = renderWithQuery(<ReviewResultsBadge generationId="gen-1" state={{ kind: "running" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing without a generation id", () => {
    const { container } = renderWithQuery(<ReviewResultsBadge generationId={null} state={{ kind: "done" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the review button when the state is done", () => {
    renderWithQuery(<ReviewResultsBadge generationId="gen-1" state={{ kind: "done" }} />);
    expect(screen.getByRole("button", { name: /Review/ })).toBeInTheDocument();
  });
});
