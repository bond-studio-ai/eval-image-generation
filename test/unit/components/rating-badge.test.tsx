// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RatingBadge } from "@/components/rating-badge";

describe("RatingBadge", () => {
  it("renders 'Unrated' for a null rating", () => {
    render(<RatingBadge rating={null} />);
    expect(screen.getByText("Unrated")).toBeInTheDocument();
  });

  it("prefixes the label when unrated", () => {
    render(<RatingBadge rating={null} label="Scene" />);
    expect(screen.getByText("Scene: Unrated")).toBeInTheDocument();
  });

  it("renders known ratings with their label", () => {
    render(<RatingBadge rating="GOOD" />);
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("prefixes the label for a known rating", () => {
    render(<RatingBadge rating="FAILED" label="Product" />);
    expect(screen.getByText("Product: Failed")).toBeInTheDocument();
  });

  it("renders nothing for an unknown rating", () => {
    const { container } = render(<RatingBadge rating="WEIRD" />);
    expect(container).toBeEmptyDOMElement();
  });
});
