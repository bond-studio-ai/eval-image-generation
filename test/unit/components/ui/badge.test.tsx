// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Reviewed</Badge>);
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
  });

  it("defaults to the neutral soft palette", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-surface-sunken", "text-text-secondary");
  });

  it("applies the tone + variant palette", () => {
    render(
      <Badge tone="success" variant="solid">
        Done
      </Badge>
    );
    const badge = screen.getByText("Done");
    expect(badge).toHaveClass("bg-success-600", "text-text-inverse");
  });

  it("applies the outline variant palette", () => {
    render(
      <Badge tone="info" variant="outline">
        Preset
      </Badge>
    );
    expect(screen.getByText("Preset")).toHaveClass("text-info-700");
  });

  it("renders the iconLeft slot", () => {
    render(<Badge iconLeft={<svg data-testid="icon" />}>With icon</Badge>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("merges a custom className and forwards span attributes", () => {
    render(
      <Badge className="mt-4" data-testid="badge">
        Tagged
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("mt-4");
  });
});
