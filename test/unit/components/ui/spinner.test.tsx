// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "@/components/ui/spinner";

describe("Spinner", () => {
  it("renders a status role with a default label", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Loading");
    expect(spinner).toHaveClass("animate-spin");
  });

  it("applies the size class", () => {
    render(<Spinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("h-6", "w-6");
  });

  it("honors a custom label", () => {
    render(<Spinner label="Fetching" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Fetching");
  });
});
