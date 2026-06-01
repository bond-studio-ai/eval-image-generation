// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/app/strategies/[id]/status-badge";

describe("strategy run StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("applies the known status palette", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("failed")).toHaveClass("bg-danger-100");
  });

  it("falls back to the pending palette for unknown statuses", () => {
    render(<StatusBadge status="mystery" />);
    expect(screen.getByText("mystery")).toHaveClass("bg-surface-sunken");
  });
});
