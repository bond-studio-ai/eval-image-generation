// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Banner } from "@/components/ui/banner";

describe("Banner", () => {
  it("renders title, description, icon, and actions slots", () => {
    render(<Banner tone="info" icon={<svg data-testid="icon" />} title="Heads up" description="Something to note" actions={<button type="button">Act</button>} />);
    expect(screen.getByText("Heads up")).toBeInTheDocument();
    expect(screen.getByText("Something to note")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
  });

  it("applies the tone surface class", () => {
    const { container } = render(<Banner tone="danger" title="Error" />);
    expect(container.firstChild).toHaveClass("bg-danger-50");
  });

  it("omits optional slots when not provided", () => {
    render(<Banner description="standalone" />);
    expect(screen.getByText("standalone")).toBeInTheDocument();
  });
});
