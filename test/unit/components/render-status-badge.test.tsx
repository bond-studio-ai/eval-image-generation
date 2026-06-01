// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderStatusBadge } from "@/components/render-status-badge";

describe("RenderStatusBadge", () => {
  it("renders known status labels", () => {
    render(<RenderStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("applies the success tone for completed", () => {
    render(<RenderStatusBadge status="completed" />);
    expect(screen.getByText("Completed")).toHaveClass("bg-success-50");
  });

  it("falls back to the raw text for unknown statuses", () => {
    render(<RenderStatusBadge status="quantum" />);
    expect(screen.getByText("quantum")).toHaveClass("bg-surface-sunken");
  });

  it("shows 'Unknown' for an empty status", () => {
    render(<RenderStatusBadge status="" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
