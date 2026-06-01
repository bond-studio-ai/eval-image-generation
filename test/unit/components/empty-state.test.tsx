// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("always renders the title", () => {
    render(<EmptyState title="No strategies yet" />);
    expect(screen.getByRole("heading", { name: "No strategies yet" })).toBeInTheDocument();
  });

  it("renders description and action when provided", () => {
    render(<EmptyState title="Empty" description="Add one to begin" action={<button type="button">New</button>} />);
    expect(screen.getByText("Add one to begin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  it("applies the subtle tone surface", () => {
    const { container } = render(<EmptyState title="Empty" tone="subtle" />);
    expect(container.firstChild).toHaveClass("bg-surface-muted");
  });
});
