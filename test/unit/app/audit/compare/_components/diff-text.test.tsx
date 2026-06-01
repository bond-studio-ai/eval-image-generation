// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffText } from "@/app/audit/compare/_components/diff-text";

describe("DiffText", () => {
  it("renders a single block when both sides are identical", () => {
    const { container } = render(<DiffText left="same text" right="same text" />);
    expect(container.querySelectorAll("pre")).toHaveLength(1);
    expect(screen.getByText("same text")).toBeInTheDocument();
  });

  it("renders a two-column word diff when the sides differ", () => {
    const { container } = render(<DiffText left="hello world" right="hello there" />);
    expect(container.querySelectorAll("pre")).toHaveLength(2);
    // shared word appears on both sides
    expect(screen.getAllByText(/hello/).length).toBeGreaterThan(0);
  });
});
