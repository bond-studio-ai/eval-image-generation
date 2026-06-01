// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CollapsibleCategoryGrid, SegmentationLegend } from "@/components/review-results/category-grid";
import type { CategoryRow } from "@/components/review-results/types";

function row(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return { category: "vanities", label: "Vanities", color: "#E6194B", composite: null, masks: [], topScore: null, ...overrides };
}

describe("SegmentationLegend", () => {
  it("renders one swatch per unique category", () => {
    render(<SegmentationLegend rows={[row(), row({ category: "faucets", label: "Faucets" })]} />);
    expect(screen.getByText("Vanities")).toBeInTheDocument();
    expect(screen.getByText("Faucets")).toBeInTheDocument();
  });

  it("dedupes repeated categories and prefers the base label", () => {
    render(<SegmentationLegend rows={[row({ baseLabel: "Vanity" }), row()]} />);
    expect(screen.getAllByText("Vanity")).toHaveLength(1);
  });
});

describe("CollapsibleCategoryGrid", () => {
  it("summarizes category and mask counts and stays collapsed by default", () => {
    render(<CollapsibleCategoryGrid rows={[row(), row({ category: "faucets", label: "Faucets" })]} />);
    const toggle = screen.getByRole("button", { name: /Per-category masks/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("2 categories")).toBeInTheDocument();
  });

  it("expands to reveal the per-category cards on click", async () => {
    render(<CollapsibleCategoryGrid rows={[row()]} />);
    const toggle = screen.getByRole("button", { name: /Per-category masks/ });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("No masks returned")).toBeInTheDocument();
    expect(screen.getByText("1 category")).toBeInTheDocument();
  });
});
