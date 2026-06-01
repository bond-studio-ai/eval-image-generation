// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, StatCard } from "@/components/ui/card";

describe("Card", () => {
  it("renders children with a border and default padding", () => {
    const { container } = render(<Card>Body</Card>);
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("border", "p-6");
  });

  it("drops the border when borderless", () => {
    const { container } = render(<Card borderless>X</Card>);
    expect(container.firstChild).not.toHaveClass("border");
  });

  it("uses the requested padding", () => {
    const { container } = render(<Card padding="sm">X</Card>);
    expect(container.firstChild).toHaveClass("p-4");
  });
});

describe("StatCard", () => {
  it("renders label, value, and an optional hint", () => {
    render(<StatCard label="Total" value={42} hint="last 7 days" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("last 7 days")).toBeInTheDocument();
  });

  it("omits the hint when not provided", () => {
    render(<StatCard label="Total" value={1} />);
    expect(screen.queryByText("last 7 days")).not.toBeInTheDocument();
  });
});
